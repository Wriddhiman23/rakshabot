import io
import csv
import math
import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import engine, Base, get_db, SessionLocal
from models import Unit, Mission, Victim, HazardZone, MissionLog, CommsMessage
from schemas import (
    UnitResponse, MissionResponse, VictimResponse, HazardZoneResponse,
    MissionLogResponse, CommsMessageResponse, CommsMessageCreate,
    EmergencyReportRequest, MissionDispatchRequest, OverrideCommandRequest,
    NearestUnitSuggestion
)
from websocket import manager
from simulator import simulator, calculate_distance_meters
from seed_data import seed_database

# Create database tables and seed
Base.metadata.create_all(bind=engine)
with SessionLocal() as db_session:
    seed_database(db_session)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start simulator
    await simulator.start()
    yield
    # Shutdown
    simulator.is_running = False

app = FastAPI(
    title="RakshaBot C2 Emergency Drone & Ground Robot System API",
    description="Backend API for Smart India Hackathon Live Drone & Robot C2 Operations",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open and receive optional ping/client commands
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# ----------------- UNITS ENDPOINTS -----------------
@app.get("/api/units", response_model=List[UnitResponse])
def get_units(db: Session = Depends(get_db)):
    return db.query(Unit).all()

@app.get("/api/units/{unit_id}", response_model=UnitResponse)
def get_unit(unit_id: int, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter_by(id=unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit

@app.post("/api/units/{unit_id}/override")
async def override_unit(unit_id: int, req: OverrideCommandRequest, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter_by(id=unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    cmd = req.command.upper()
    mission = None
    if unit.current_mission_id:
        mission = db.query(Mission).filter_by(id=unit.current_mission_id).first()

    if cmd == "RECALL":
        unit.status = "RETURNING"
        if mission:
            mission.status = "ABORTED"
        msg = f"Manual override: {unit.callsign} RECALLED to base by operator. Reason: {req.reason or 'User manual abort'}"
        level = "WARNING"

    elif cmd == "HOLD":
        unit.status = "HOLDING"
        if mission:
            mission.status = "HOLDING"
        msg = f"Manual override: {unit.callsign} HOLD POSITION command engaged. Loitering at altitude {unit.altitude}m."
        level = "WARNING"

    elif cmd == "RTH":
        unit.status = "RETURNING"
        if mission and mission.status != "COMPLETED":
            mission.status = "RETURNING"
        msg = f"Manual override: {unit.callsign} Return-To-Home (RTH) failsafe triggered."
        level = "INFO"

    elif cmd == "DROP_PAYLOAD":
        unit.payload_status = "DEPLOYED"
        if mission:
            mission.status = "PAYLOAD_DELIVERED"
            mission.delivered_at = datetime.datetime.utcnow()
        msg = f"Manual override: Operator force-dropped payload [{unit.current_payload}] from {unit.callsign}."
        level = "CRITICAL"

    elif cmd == "RESUME":
        if mission:
            unit.status = "EN_ROUTE"
            mission.status = "EN_ROUTE"
            msg = f"Manual override: {unit.callsign} mission transit resumed towards {mission.target_landmark}."
            level = "INFO"
        else:
            unit.status = "IDLE"
            msg = f"{unit.callsign} returned to idle state."
            level = "INFO"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown command {cmd}")

    log = MissionLog(
        mission_id=mission.id if mission else None,
        event_type="OVERRIDE",
        unit_callsign=unit.callsign,
        message=msg,
        level=level
    )
    db.add(log)
    db.commit()

    await manager.broadcast("OVERRIDE_EXECUTED", {
        "unit_id": unit.id,
        "callsign": unit.callsign,
        "command": cmd,
        "status": unit.status
    })

    return {"status": "success", "message": msg, "unit_status": unit.status}


# ----------------- MISSIONS ENDPOINTS -----------------
@app.get("/api/missions", response_model=List[MissionResponse])
def get_missions(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Mission).order_by(Mission.dispatched_at.desc())
    if status:
        query = query.filter(Mission.status == status)
    return query.all()

@app.post("/api/missions/dispatch", response_model=MissionResponse)
async def dispatch_mission(req: MissionDispatchRequest, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter_by(id=req.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Selected unit does not exist")

    if unit.status not in ["IDLE", "HOLDING", "RETURNING"]:
        # Warn or allow reassignment
        pass

    mission_number = f"MSN-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{int(datetime.datetime.utcnow().timestamp()) % 1000:03d}"
    title = req.title or f"Emergency Dispatch - {req.incident_type.capitalize()} at {req.target_landmark}"

    mission = Mission(
        mission_number=mission_number,
        title=title,
        incident_type=req.incident_type,
        priority=req.priority,
        status="EN_ROUTE",
        unit_id=unit.id,
        target_lat=req.target_lat,
        target_lng=req.target_lng,
        target_landmark=req.target_landmark,
        victim_id=req.victim_id,
        payload_item=req.payload_item,
        dispatched_at=datetime.datetime.utcnow(),
        notes=req.notes or ""
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    # Update unit status
    unit.status = "EN_ROUTE"
    unit.current_mission_id = mission.id
    unit.current_payload = req.payload_item
    unit.payload_status = "IN_TRANSIT"
    unit.detection_label = f"En-route to {req.target_landmark}"

    # If associated with victim, update victim status
    if req.victim_id:
        victim = db.query(Victim).filter_by(id=req.victim_id).first()
        if victim:
            victim.status = "DRONE_EN_ROUTE"
            victim.assigned_mission_id = mission.id

    log = MissionLog(
        mission_id=mission.id,
        event_type="DISPATCH",
        unit_callsign=unit.callsign,
        message=f"Dispatched {unit.callsign} ({unit.unit_type}) to {req.target_landmark}. Payload: {req.payload_item}.",
        level="CRITICAL"
    )
    db.add(log)
    db.commit()

    await manager.broadcast("MISSION_DISPATCHED", {
        "mission_id": mission.id,
        "mission_number": mission.mission_number,
        "callsign": unit.callsign,
        "landmark": req.target_landmark,
        "payload": req.payload_item
    })

    return mission


# ----------------- EMERGENCY ALERT INTAKE & AUTO-SUGGESTION -----------------
PAYLOAD_MAP = {
    "cardiac": "AED (Automated External Defibrillator)",
    "trauma": "Trauma Kit & Burn Dressing",
    "flood": "Inflatable Lifebuoys & Baby Rations",
    "collapse": "Search & Rescue Locator Beacon & Trauma Pack",
    "snakebite": "Antivenom & EpiPen Injectors"
}

@app.get("/api/emergency/suggest-nearest")
def suggest_nearest(
    lat: float = Query(...),
    lng: float = Query(...),
    incident_type: str = Query("cardiac"),
    db: Session = Depends(get_db)
):
    units = db.query(Unit).all()
    suggestions = []
    recommended_payload = PAYLOAD_MAP.get(incident_type.lower(), "Standard Emergency First Aid")

    for u in units:
        dist_m = calculate_distance_meters(u.latitude, u.longitude, lat, lng)
        speed = 24.0 if u.unit_type == "drone" else 7.0
        eta_sec = int(dist_m / max(1.0, speed))

        # Suitability score calculation
        availability_bonus = 30.0 if u.status == "IDLE" else (10.0 if u.status == "RETURNING" else 0.0)
        battery_penalty = max(0.0, (100.0 - u.battery) * 0.3)
        dist_penalty = (dist_m / 1000.0) * 8.0
        drone_bonus = 25.0 if (incident_type in ["cardiac", "snakebite"] and u.unit_type == "drone") else 0.0
        rover_bonus = 20.0 if (incident_type in ["flood"] and u.unit_type == "ground_robot") else 0.0

        score = max(10.0, min(99.0, 100.0 + availability_bonus + drone_bonus + rover_bonus - dist_penalty - battery_penalty))

        unit_resp = UnitResponse.model_validate(u)
        suggestions.append(NearestUnitSuggestion(
            unit=unit_resp,
            distance_meters=round(dist_m, 1),
            estimated_arrival_seconds=eta_sec,
            suitability_score=round(score, 1),
            recommended_payload=recommended_payload
        ))

    # Sort descending by suitability score
    suggestions.sort(key=lambda s: s.suitability_score, reverse=True)
    return suggestions

@app.post("/api/emergency/report")
async def report_emergency(req: EmergencyReportRequest, db: Session = Depends(get_db)):
    # Create new victim / incident entry
    code_num = db.query(Victim).count() + 105
    v_code = f"VIC-{code_num}"
    condition_desc = f"{req.incident_type.capitalize()} alert reported ({req.affected_count} persons affected). {req.description or ''}"

    victim = Victim(
        victim_code=v_code,
        name=f"Reported Incident ({req.affected_count} victims)",
        condition=condition_desc,
        priority=req.severity,
        latitude=req.latitude,
        longitude=req.longitude,
        landmark=req.landmark,
        detected_at=datetime.datetime.utcnow(),
        status="DETECTED",
        detected_by_unit="Emergency 112 Intake",
        confidence_score=96.0,
        thermal_signature="Unverified Thermal",
        vitals_summary=f"Caller: {req.caller_name}. {req.description or 'Awaiting initial responder arrival.'}"
    )
    db.add(victim)

    log = MissionLog(
        event_type="ALERT",
        unit_callsign="Intake 112",
        message=f"NEW INCIDENT: {req.incident_type.upper()} at {req.landmark}. Severity: {req.severity}. Priority triage queued.",
        level="CRITICAL" if req.severity == "CRITICAL" else "WARNING"
    )
    db.add(log)
    db.commit()
    db.refresh(victim)

    await manager.broadcast("NEW_EMERGENCY_ALERT", {
        "victim_id": victim.id,
        "victim_code": victim.victim_code,
        "landmark": victim.landmark,
        "incident_type": req.incident_type,
        "severity": req.severity,
        "lat": req.latitude,
        "lng": req.longitude
    })

    return {"status": "success", "victim": VictimResponse.model_validate(victim)}


# ----------------- VICTIMS ENDPOINTS -----------------
@app.get("/api/victims", response_model=List[VictimResponse])
def get_victims(db: Session = Depends(get_db)):
    return db.query(Victim).order_by(Victim.detected_at.desc()).all()

@app.patch("/api/victims/{victim_id}/status")
async def update_victim_status(victim_id: int, status: str, db: Session = Depends(get_db)):
    victim = db.query(Victim).filter_by(id=victim_id).first()
    if not victim:
        raise HTTPException(status_code=404, detail="Victim not found")
    victim.status = status
    db.commit()

    await manager.broadcast("VICTIM_STATUS_UPDATED", {
        "victim_id": victim.id,
        "status": status,
        "victim_code": victim.victim_code
    })

    return {"status": "success", "victim": VictimResponse.model_validate(victim)}


# ----------------- HAZARD ZONES -----------------
@app.get("/api/hazards", response_model=List[HazardZoneResponse])
def get_hazards(db: Session = Depends(get_db)):
    return db.query(HazardZone).all()


# ----------------- LOGS & ANALYTICS -----------------
@app.get("/api/logs", response_model=List[MissionLogResponse])
def get_logs(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(MissionLog).order_by(MissionLog.timestamp.desc()).limit(limit).all()

@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    completed_missions = db.query(Mission).filter(Mission.status == "COMPLETED").all()
    all_missions = db.query(Mission).all()

    # Response times
    valid_times = [m.response_time_seconds for m in completed_missions if m.response_time_seconds]
    avg_response_time = round(sum(valid_times) / len(valid_times), 1) if valid_times else 145.0

    # Missions by type
    type_counts = {}
    for m in all_missions:
        type_counts[m.incident_type] = type_counts.get(m.incident_type, 0) + 1

    type_distribution = [{"name": k.capitalize(), "count": v} for k, v in type_counts.items()]

    # Response time by type
    type_times = {}
    for m in completed_missions:
        if m.response_time_seconds:
            type_times.setdefault(m.incident_type, []).append(m.response_time_seconds)

    avg_by_type = [
        {
            "type": k.capitalize(),
            "avg_seconds": round(sum(vals) / len(vals), 0)
        }
        for k, vals in type_times.items()
    ]
    if not avg_by_type:
        avg_by_type = [
            {"type": "Cardiac", "avg_seconds": 135},
            {"type": "Snakebite", "avg_seconds": 160},
            {"type": "Trauma", "avg_seconds": 150},
            {"type": "Flood", "avg_seconds": 540},
        ]

    # Payload deliveries count
    payloads_count = len([m for m in all_missions if m.status in ["PAYLOAD_DELIVERED", "COMPLETED", "RETURNING"]])

    # Detection accuracy stats
    victims = db.query(Victim).all()
    avg_conf = round(sum(v.confidence_score for v in victims) / len(victims), 1) if victims else 93.2

    return {
        "total_missions": len(all_missions),
        "completed_missions": len(completed_missions),
        "active_missions": len([m for m in all_missions if m.status in ["ASSIGNED", "EN_ROUTE", "ON_SITE", "PAYLOAD_DELIVERED"]]),
        "average_response_seconds": avg_response_time,
        "payloads_delivered": payloads_count,
        "ai_detection_accuracy_pct": avg_conf,
        "missions_by_type": type_distribution,
        "avg_response_by_type": avg_by_type,
        "active_units_count": db.query(Unit).filter(Unit.status != "OFFLINE").count(),
        "total_victims_tracked": len(victims),
        "rescued_count": len([v for v in victims if v.status in ["RESCUED", "EVACUATED", "FIRST_AID_DROPPED"]])
    }

@app.get("/api/export/csv")
def export_csv(db: Session = Depends(get_db)):
    missions = db.query(Mission).order_by(Mission.dispatched_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Mission Number", "Title", "Incident Type", "Priority", "Status",
        "Assigned Unit ID", "Target Landmark", "Target Latitude", "Target Longitude",
        "Payload Item", "Dispatched At (UTC)", "Arrived At (UTC)", "Delivered At (UTC)",
        "Response Time (Seconds)", "Notes"
    ])

    for m in missions:
        writer.writerow([
            m.mission_number,
            m.title,
            m.incident_type,
            m.priority,
            m.status,
            m.unit_id,
            m.target_landmark,
            m.target_lat,
            m.target_lng,
            m.payload_item,
            m.dispatched_at.isoformat() if m.dispatched_at else "",
            m.arrived_at.isoformat() if m.arrived_at else "",
            m.delivered_at.isoformat() if m.delivered_at else "",
            m.response_time_seconds if m.response_time_seconds else "",
            m.notes
        ])

    output.seek(0)
    filename = f"RakshaBot_Missions_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ----------------- COMMS & TWO-WAY PUSH-TO-TALK -----------------
@app.get("/api/comms", response_model=List[CommsMessageResponse])
def get_comms(limit: int = 30, db: Session = Depends(get_db)):
    return db.query(CommsMessage).order_by(CommsMessage.timestamp.desc()).limit(limit).all()

@app.post("/api/comms", response_model=CommsMessageResponse)
async def post_comms_message(req: CommsMessageCreate, db: Session = Depends(get_db)):
    comm = CommsMessage(
        channel=req.channel,
        sender=req.sender,
        recipient=req.recipient,
        message=req.message,
        is_audio=req.is_audio,
        is_from_drone=req.is_from_drone,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)

    await manager.broadcast("NEW_COMMS_MESSAGE", {
        "id": comm.id,
        "sender": comm.sender,
        "recipient": comm.recipient,
        "message": comm.message,
        "channel": comm.channel,
        "is_audio": comm.is_audio,
        "is_from_drone": comm.is_from_drone,
        "timestamp": comm.timestamp.isoformat()
    })

    return comm


# ----------------- DEMO SCENARIO ENDPOINTS -----------------
@app.post("/api/demo/run")
async def run_demo():
    result = await simulator.run_demo_scenario()
    return result

@app.post("/api/demo/reset")
async def reset_demo():
    result = await simulator.reset_demo()
    return result

@app.get("/api/demo/status")
def get_demo_status():
    return {
        "demo_active": simulator.demo_active,
        "demo_step": simulator.demo_step
    }
