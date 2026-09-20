import asyncio
import math
import datetime
import logging
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Unit, Mission, Victim, MissionLog, CommsMessage
from websocket import manager

logger = logging.getLogger("rakshabot.simulator")

def calculate_distance_meters(lat1, lon1, lat2, lon2):
    """Haversine distance in meters"""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_bearing(lat1, lon1, lat2, lon2):
    """Calculate bearing in degrees from point 1 to point 2"""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360

class LiveUnit:
    """In-memory representation of unit telemetry (position, battery, speed, altitude)"""
    def __init__(
        self,
        id: int,
        callsign: str,
        unit_type: str,
        model_name: str,
        status: str = "IDLE",
        latitude: float = 9.9850,
        longitude: float = 76.2950,
        altitude: float = 0.0,
        speed: float = 0.0,
        battery: float = 100.0,
        signal_dbm: int = -65,
        heading_deg: float = 0.0,
        payload_capacity_kg: float = 5.0,
        current_payload: str = "None",
        payload_status: str = "LOADED",
        current_mission_id: Optional[int] = None,
        camera_active: bool = True,
        detection_label: str = "Clear - Scanning Area",
        home_lat: float = 9.9850,
        home_lng: float = 76.2950,
    ):
        self.id = id
        self.callsign = callsign
        self.unit_type = unit_type
        self.model_name = model_name
        self.status = status
        self.latitude = float(latitude)
        self.longitude = float(longitude)
        self.altitude = float(altitude)
        self.speed = float(speed)
        self.battery = float(battery)
        self.signal_dbm = int(signal_dbm)
        self.heading_deg = float(heading_deg)
        self.payload_capacity_kg = float(payload_capacity_kg)
        self.current_payload = str(current_payload)
        self.payload_status = str(payload_status)
        self.current_mission_id = current_mission_id
        self.camera_active = bool(camera_active)
        self.detection_label = str(detection_label)
        self.home_lat = float(home_lat)
        self.home_lng = float(home_lng)

    @classmethod
    def from_orm(cls, u: Unit):
        return cls(
            id=u.id,
            callsign=u.callsign,
            unit_type=u.unit_type,
            model_name=u.model_name,
            status=u.status,
            latitude=u.latitude,
            longitude=u.longitude,
            altitude=u.altitude,
            speed=u.speed,
            battery=u.battery,
            signal_dbm=u.signal_dbm,
            heading_deg=u.heading_deg,
            payload_capacity_kg=u.payload_capacity_kg,
            current_payload=u.current_payload,
            payload_status=u.payload_status,
            current_mission_id=u.current_mission_id,
            camera_active=u.camera_active,
            detection_label=u.detection_label,
            home_lat=u.home_lat,
            home_lng=u.home_lng,
        )

    def to_telemetry_dict(self) -> dict:
        return {
            "id": self.id,
            "callsign": self.callsign,
            "unit_type": self.unit_type,
            "status": self.status,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "altitude": round(self.altitude, 1),
            "speed": round(self.speed, 1),
            "battery": round(self.battery, 1),
            "signal_dbm": self.signal_dbm,
            "heading_deg": round(self.heading_deg, 1),
            "payload_status": self.payload_status,
            "current_payload": self.current_payload,
            "detection_label": self.detection_label
        }


class SimulationEngine:
    def __init__(self):
        self.is_running = False
        self.tick_rate = 1.0  # seconds per simulation tick
        self.demo_task = None
        self.demo_active = False
        self.demo_step = ""
        self.units: Dict[int, LiveUnit] = {}
        self.active_missions: Dict[int, dict] = {}

    def ensure_units_loaded(self):
        if not self.units:
            self.init_units()

    def init_units(self):
        """Loads units from DB into in-memory LiveUnit cache"""
        try:
            with SessionLocal() as db:
                db_units = db.query(Unit).all()
                for u in db_units:
                    self.units[u.id] = LiveUnit.from_orm(u)
            logger.info(f"Loaded {len(self.units)} units into in-memory telemetry store.")
        except Exception as e:
            logger.warning(f"Error loading units from DB: {type(e).__name__}")

    def get_units(self) -> List[LiveUnit]:
        self.ensure_units_loaded()
        return list(self.units.values())

    def get_unit(self, unit_id: int) -> Optional[LiveUnit]:
        self.ensure_units_loaded()
        return self.units.get(unit_id)

    def get_unit_by_callsign(self, callsign: str) -> Optional[LiveUnit]:
        self.ensure_units_loaded()
        for u in self.units.values():
            if u.callsign == callsign:
                return u
        return None

    def get_mission_info(self, mission_id: int, db: Session) -> Optional[dict]:
        if mission_id in self.active_missions:
            return self.active_missions[mission_id]
        m = db.query(Mission).filter_by(id=mission_id).first()
        if m:
            info = {
                "id": m.id,
                "mission_number": m.mission_number,
                "target_lat": m.target_lat,
                "target_lng": m.target_lng,
                "target_landmark": m.target_landmark,
                "payload_item": m.payload_item,
                "victim_id": m.victim_id,
                "dispatched_at": m.dispatched_at,
                "status": m.status
            }
            self.active_missions[mission_id] = info
            return info
        return None

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.ensure_units_loaded()
        asyncio.create_task(self._simulation_loop())
        logger.info("RakshaBot Simulation Engine initialized and active.")

    async def _simulation_loop(self):
        while self.is_running:
            try:
                await self._process_tick()
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}", exc_info=True)
            await asyncio.sleep(self.tick_rate)

    async def _process_tick(self):
        self.ensure_units_loaded()
        if not self.units:
            return

        updated_units = []
        db: Optional[Session] = None

        try:
            for unit in self.units.values():
                if unit.status == "OFFLINE":
                    continue

                # Check if unit has an active mission
                active_mission = None
                if unit.current_mission_id:
                    if db is None:
                        db = SessionLocal()
                    active_mission = self.get_mission_info(unit.current_mission_id, db)

                # State: EN_ROUTE
                if unit.status == "EN_ROUTE" and active_mission:
                    target_lat = active_mission["target_lat"]
                    target_lng = active_mission["target_lng"]

                    dist = calculate_distance_meters(unit.latitude, unit.longitude, target_lat, target_lng)
                    bearing = calculate_bearing(unit.latitude, unit.longitude, target_lat, target_lng)
                    unit.heading_deg = round(bearing, 1)

                    speed_mps = 24.0 if unit.unit_type == "drone" else 7.5
                    unit.speed = round(speed_mps + (0.5 - (hash(str(unit.id) + str(datetime.datetime.utcnow().second)) % 10) / 10.0), 1)

                    if unit.unit_type == "drone":
                        unit.altitude = min(65.0, unit.altitude + 6.0)
                    else:
                        unit.altitude = 0.0

                    unit.battery = max(5.0, unit.battery - 0.03)

                    # Step move towards target
                    step_meters = speed_mps * self.tick_rate
                    if dist <= step_meters or dist <= 25.0:
                        # Arrived on site
                        unit.latitude = target_lat
                        unit.longitude = target_lng
                        unit.status = "ON_SITE"
                        unit.speed = 1.0 if unit.unit_type == "drone" else 0.0
                        if unit.unit_type == "drone":
                            unit.altitude = 18.0  # Descend to payload release altitude

                        # Write mission and log to Neon
                        m_db = db.query(Mission).filter_by(id=active_mission["id"]).first()
                        if m_db:
                            m_db.status = "ON_SITE"
                            m_db.arrived_at = datetime.datetime.utcnow()
                        active_mission["status"] = "ON_SITE"

                        log = MissionLog(
                            mission_id=active_mission["id"],
                            event_type="TELEMETRY",
                            unit_callsign=unit.callsign,
                            message=f"{unit.callsign} reached target destination: {active_mission['target_landmark']}. Altitude adjusted to 18m.",
                            level="SUCCESS"
                        )
                        db.add(log)
                        db.commit()

                        await manager.broadcast("MISSION_UPDATE", {
                            "mission_id": active_mission["id"],
                            "status": "ON_SITE",
                            "message": f"{unit.callsign} has arrived on site at {active_mission['target_landmark']}"
                        })
                    else:
                        fraction = step_meters / dist
                        unit.latitude += (target_lat - unit.latitude) * fraction
                        unit.longitude += (target_lng - unit.longitude) * fraction

                # State: ON_SITE
                elif unit.status == "ON_SITE" and active_mission:
                    unit.battery = max(5.0, unit.battery - 0.02)
                    if active_mission["status"] == "ON_SITE":
                        # Deploy payload
                        m_db = db.query(Mission).filter_by(id=active_mission["id"]).first()
                        delivered_now = datetime.datetime.utcnow()
                        if m_db:
                            m_db.status = "PAYLOAD_DELIVERED"
                            m_db.delivered_at = delivered_now
                            if m_db.dispatched_at:
                                delta = (delivered_now - m_db.dispatched_at).total_seconds()
                                m_db.response_time_seconds = int(delta)
                        active_mission["status"] = "PAYLOAD_DELIVERED"

                        unit.payload_status = "DEPLOYED"

                        if active_mission.get("victim_id"):
                            victim = db.query(Victim).filter_by(id=active_mission["victim_id"]).first()
                            if victim:
                                victim.status = "FIRST_AID_DROPPED"

                        log = MissionLog(
                            mission_id=active_mission["id"],
                            event_type="PAYLOAD_DROP",
                            unit_callsign=unit.callsign,
                            message=f"Payload [{active_mission['payload_item']}] successfully air-dropped with precision tether at {active_mission['target_landmark']}.",
                            level="CRITICAL"
                        )
                        db.add(log)

                        # Auto Comms announcement
                        comm = CommsMessage(
                            channel=f"{unit.callsign.upper()}-LINK",
                            sender=f"{unit.callsign} (Automated Drone PA)",
                            recipient="Victim / Ground On-Site",
                            message=f"[Loudspeaker] Emergency payload {active_mission['payload_item']} dropped. Follow audio instructions.",
                            is_audio=True,
                            is_from_drone=True
                        )
                        db.add(comm)
                        db.commit()

                        await manager.broadcast("PAYLOAD_DELIVERED", {
                            "mission_id": active_mission["id"],
                            "unit_callsign": unit.callsign,
                            "payload": active_mission["payload_item"],
                            "landmark": active_mission["target_landmark"]
                        })

                    elif active_mission["status"] == "PAYLOAD_DELIVERED":
                        # Command return
                        unit.status = "RETURNING"
                        m_db = db.query(Mission).filter_by(id=active_mission["id"]).first()
                        if m_db:
                            m_db.status = "RETURNING"
                        active_mission["status"] = "RETURNING"

                        log = MissionLog(
                            mission_id=active_mission["id"],
                            event_type="TELEMETRY",
                            unit_callsign=unit.callsign,
                            message=f"Payload secured by on-site responders. {unit.callsign} initiating Return to Home (RTH).",
                            level="INFO"
                        )
                        db.add(log)
                        db.commit()

                # State: RETURNING
                elif unit.status == "RETURNING":
                    dist = calculate_distance_meters(unit.latitude, unit.longitude, unit.home_lat, unit.home_lng)
                    bearing = calculate_bearing(unit.latitude, unit.longitude, unit.home_lat, unit.home_lng)
                    unit.heading_deg = round(bearing, 1)

                    speed_mps = 22.0 if unit.unit_type == "drone" else 6.5
                    unit.speed = speed_mps
                    if unit.unit_type == "drone":
                        unit.altitude = min(50.0, unit.altitude + 2.0)
                    unit.battery = max(5.0, unit.battery - 0.02)

                    step_meters = speed_mps * self.tick_rate
                    if dist <= step_meters or dist <= 20.0:
                        # Landed back home
                        unit.latitude = unit.home_lat
                        unit.longitude = unit.home_lng
                        unit.status = "IDLE"
                        unit.speed = 0.0
                        unit.altitude = 0.0
                        unit.payload_status = "LOADED"
                        unit.current_payload = "Standard Medical Kit" if unit.unit_type == "drone" else "Rations & Comms Pack"

                        if active_mission:
                            m_db = db.query(Mission).filter_by(id=active_mission["id"]).first()
                            if m_db:
                                m_db.status = "COMPLETED"
                                m_db.completed_at = datetime.datetime.utcnow()

                            mission_number = active_mission["mission_number"]
                            mission_id = active_mission["id"]
                            self.active_missions.pop(mission_id, None)
                            unit.current_mission_id = None

                            log = MissionLog(
                                mission_id=mission_id,
                                event_type="COMPLETION",
                                unit_callsign=unit.callsign,
                                message=f"{unit.callsign} safely touched down at NDRF Base Helipad. Mission {mission_number} complete.",
                                level="SUCCESS"
                            )
                            db.add(log)
                            db.commit()

                            await manager.broadcast("MISSION_UPDATE", {
                                "mission_id": mission_id,
                                "status": "COMPLETED",
                                "message": f"Mission {mission_number} completed. Unit {unit.callsign} is ready for redeployment."
                            })
                    else:
                        fraction = step_meters / dist
                        unit.latitude += (unit.home_lat - unit.latitude) * fraction
                        unit.longitude += (unit.home_lng - unit.longitude) * fraction

                # State: HOLDING
                elif unit.status == "HOLDING":
                    unit.speed = 0.0
                    unit.battery = max(5.0, unit.battery - 0.01)

                # State: IDLE
                elif unit.status == "IDLE":
                    if unit.battery < 99.0:
                        unit.battery = min(100.0, round(unit.battery + 0.15, 1))

                # Patrol for Netra-01
                if unit.callsign == "Netra-01" and unit.status == "EN_ROUTE" and not active_mission:
                    t = datetime.datetime.utcnow().timestamp() / 25.0
                    unit.latitude = 10.0050 + 0.008 * math.sin(t)
                    unit.longitude = 76.3300 + 0.008 * math.cos(t)
                    unit.heading_deg = (math.degrees(t) + 90) % 360
                    unit.speed = 18.0
                    unit.altitude = 75.0
                    unit.battery = max(30.0, unit.battery - 0.01)

                updated_units.append(unit.to_telemetry_dict())

            # Broadcast high-frequency telemetry tick
            await manager.broadcast("TELEMETRY_TICK", {
                "units": updated_units,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "demo_active": self.demo_active,
                "demo_step": self.demo_step
            })

        finally:
            if db is not None:
                db.close()

    async def run_demo_scenario(self):
        if self.demo_active:
            return {"status": "already_running"}

        self.demo_active = True
        asyncio.create_task(self._execute_demo_sequence())
        return {"status": "started"}

    async def _execute_demo_sequence(self):
        self.ensure_units_loaded()
        with SessionLocal() as db:
            try:
                # Step 1: Cardiac Emergency Incoming
                self.demo_step = "Incoming Priority 1 Alert: Cardiac Arrest at Sector 3"
                victim_cardiac = db.query(Victim).filter_by(victim_code="VIC-101").first()
                garuda_01 = self.get_unit_by_callsign("Garuda-01")

                if not victim_cardiac or not garuda_01:
                    return

                # Trigger alert broadcast
                await manager.broadcast("NEW_EMERGENCY_ALERT", {
                    "title": "CRITICAL 112 ALERT: Sudden Cardiac Arrest",
                    "landmark": victim_cardiac.landmark,
                    "priority": "CRITICAL",
                    "suggested_unit": "Garuda-01",
                    "suggested_payload": "AED (Automated External Defibrillator)",
                    "lat": victim_cardiac.latitude,
                    "lng": victim_cardiac.longitude
                })

                log = MissionLog(
                    event_type="ALERT",
                    unit_callsign="System",
                    message="Incoming Priority 1 Cardiac Alert: Ramesh Pillai (62M) unconscious at Sector 3. AI Dispatcher assigns Garuda-01 AED unit.",
                    level="CRITICAL"
                )
                db.add(log)
                db.commit()

                await asyncio.sleep(3)

                # Step 2: Scramble Garuda-01 Drone
                self.demo_step = "Scrambling Garuda-01 Medic Hexacopter (AED Payload)"
                mission_number = f"MSN-DEMO-{int(datetime.datetime.utcnow().timestamp()) % 10000}"
                cardiac_mission = Mission(
                    mission_number=mission_number,
                    title="Cardiac Rapid Intervention - Sector 3",
                    incident_type="cardiac",
                    priority="CRITICAL",
                    status="EN_ROUTE",
                    unit_id=garuda_01.id,
                    target_lat=victim_cardiac.latitude,
                    target_lng=victim_cardiac.longitude,
                    target_landmark=victim_cardiac.landmark,
                    victim_id=victim_cardiac.id,
                    payload_item="AED (Automated External Defibrillator)",
                    dispatched_at=datetime.datetime.utcnow(),
                    notes="Rapid scramble requested. AED automatic vocal instructions enabled."
                )
                db.add(cardiac_mission)
                db.commit()
                db.refresh(cardiac_mission)

                # Update in-memory unit
                garuda_01.status = "EN_ROUTE"
                garuda_01.current_mission_id = cardiac_mission.id
                garuda_01.current_payload = "AED (Automated External Defibrillator)"
                garuda_01.payload_status = "IN_TRANSIT"
                garuda_01.detection_label = "En-route to Cardiac Emergency (ETA: 45s)"

                # Update victim in Neon
                victim_cardiac.status = "DRONE_EN_ROUTE"
                victim_cardiac.assigned_mission_id = cardiac_mission.id
                db.commit()

                # Register mission in active missions
                self.active_missions[cardiac_mission.id] = {
                    "id": cardiac_mission.id,
                    "mission_number": cardiac_mission.mission_number,
                    "target_lat": cardiac_mission.target_lat,
                    "target_lng": cardiac_mission.target_lng,
                    "target_landmark": cardiac_mission.target_landmark,
                    "payload_item": cardiac_mission.payload_item,
                    "victim_id": cardiac_mission.victim_id,
                    "dispatched_at": cardiac_mission.dispatched_at,
                    "status": cardiac_mission.status
                }

                await manager.broadcast("MISSION_UPDATE", {
                    "mission_id": cardiac_mission.id,
                    "status": "EN_ROUTE",
                    "message": f"Garuda-01 scrambled with AED. Estimated flight time: 38s."
                })

                # Let simulation move Garuda-01 for 8 seconds towards the site
                for _ in range(8):
                    if not self.demo_active:
                        break
                    await asyncio.sleep(1)

                # Step 3: Flood Rescue Detection by Netra-01
                self.demo_step = "Thermal Recon: Netra-01 detects stranded family on Aluva terrace"
                victim_flood = db.query(Victim).filter_by(victim_code="VIC-102").first()
                garuda_02 = self.get_unit_by_callsign("Garuda-02")
                varun_01 = self.get_unit_by_callsign("Varun-01")

                await manager.broadcast("VICTIM_DETECTED", {
                    "victim_code": victim_flood.victim_code,
                    "name": victim_flood.name,
                    "condition": victim_flood.condition,
                    "landmark": victim_flood.landmark,
                    "confidence": 93.8,
                    "lat": victim_flood.latitude,
                    "lng": victim_flood.longitude
                })

                log2 = MissionLog(
                    event_type="DETECTION",
                    unit_callsign="Netra-01",
                    message="FLIR Camera Alert: High heat signature isolated on Aluva Riverfront rooftop. 2 persons waving distress flags.",
                    level="WARNING"
                )
                db.add(log2)
                db.commit()

                await asyncio.sleep(3)

                # Step 4: Dispatch Coordinated Units for Flood (Varun-01 Amphibious + Garuda-02)
                self.demo_step = "Coordinated Dispatch: Varun-01 (Amphibious) + Garuda-02 (Rations & Float)"
                flood_mission_drone = Mission(
                    mission_number=f"MSN-DEMO-FLD-{int(datetime.datetime.utcnow().timestamp()) % 10000}",
                    title="Airdrop Infant Formula & Lifebuoys - Aluva",
                    incident_type="flood",
                    priority="HIGH",
                    status="EN_ROUTE",
                    unit_id=garuda_02.id,
                    target_lat=victim_flood.latitude,
                    target_lng=victim_flood.longitude,
                    target_landmark=victim_flood.landmark,
                    victim_id=victim_flood.id,
                    payload_item="Inflatable Lifebuoys & Baby Rations",
                    dispatched_at=datetime.datetime.utcnow()
                )
                db.add(flood_mission_drone)
                db.commit()
                db.refresh(flood_mission_drone)

                garuda_02.status = "EN_ROUTE"
                garuda_02.current_mission_id = flood_mission_drone.id
                garuda_02.current_payload = "Inflatable Lifebuoys & Baby Rations"
                garuda_02.payload_status = "IN_TRANSIT"

                varun_01.status = "EN_ROUTE"
                varun_01.current_payload = "Amphibious Extraction Team"

                self.active_missions[flood_mission_drone.id] = {
                    "id": flood_mission_drone.id,
                    "mission_number": flood_mission_drone.mission_number,
                    "target_lat": flood_mission_drone.target_lat,
                    "target_lng": flood_mission_drone.target_lng,
                    "target_landmark": flood_mission_drone.target_landmark,
                    "payload_item": flood_mission_drone.payload_item,
                    "victim_id": flood_mission_drone.victim_id,
                    "dispatched_at": flood_mission_drone.dispatched_at,
                    "status": flood_mission_drone.status
                }

                # Push-to-talk two-way comms message broadcast
                comm_flood = CommsMessage(
                    channel="NETRA-01-LINK",
                    sender="NDRF Lead Commander Rathore",
                    recipient="Aluva Terrace Victims",
                    message="RakshaBot C2: 'This is NDRF Rescue. Netra-01 is maintaining thermal lock above you. Garuda-02 drone is dropping flotation kits in 30 seconds. Amphibious boat Varun-01 en route.'",
                    is_audio=True,
                    is_from_drone=False
                )
                db.add(comm_flood)
                db.commit()

                await manager.broadcast("NEW_COMMS_MESSAGE", {
                    "sender": comm_flood.sender,
                    "message": comm_flood.message,
                    "channel": comm_flood.channel
                })

                # Allow units to fly and deliver
                for _ in range(12):
                    if not self.demo_active:
                        break
                    await asyncio.sleep(1)

                self.demo_step = "Demo Scenario Executed: Payloads Delivered & Units Returning"
                await asyncio.sleep(5)
                self.demo_active = False
                self.demo_step = "Demo Scenario Complete"

            except Exception as e:
                logger.error(f"Error executing demo scenario: {e}", exc_info=True)
                self.demo_active = False
                self.demo_step = f"Demo error: {str(e)}"

    async def reset_demo(self):
        """Resets units in memory and victims in DB to initial demo state"""
        self.demo_active = False
        self.demo_step = "Demo Reset"
        self.active_missions.clear()

        # Reset in-memory units
        for u in self.units.values():
            u.status = "IDLE"
            u.latitude = u.home_lat
            u.longitude = u.home_lng
            u.altitude = 0.0
            u.speed = 0.0
            u.battery = 95.0
            u.payload_status = "LOADED"
            u.current_mission_id = None
            u.detection_label = "Standby at Base"

        # Reset Netra-01 to patrol position
        netra = self.get_unit_by_callsign("Netra-01")
        if netra:
            netra.status = "EN_ROUTE"
            netra.latitude = 10.0050
            netra.longitude = 76.3300
            netra.altitude = 72.0
            netra.speed = 18.5
            netra.detection_label = "Active Thermal Scan: Sector Delta"

        with SessionLocal() as db:
            try:
                victims = db.query(Victim).all()
                for v in victims:
                    if v.victim_code == "VIC-101":
                        v.status = "AWAITING_RESCUE"
                    elif v.victim_code == "VIC-102":
                        v.status = "DETECTED"
                    elif v.victim_code == "VIC-103":
                        v.status = "AWAITING_RESCUE"
                    elif v.victim_code == "VIC-104":
                        v.status = "DETECTED"
                    v.assigned_mission_id = None

                log = MissionLog(
                    event_type="ALERT",
                    unit_callsign="System",
                    message="Demonstration reset: All drone and ground units recalled to NDRF Base 04 coordinates.",
                    level="INFO"
                )
                db.add(log)
                db.commit()

                await manager.broadcast("DEMO_RESET", {"message": "Demo state reset successfully"})
                return {"status": "success", "message": "State reset"}
            except Exception as e:
                logger.error(f"Error resetting demo: {e}", exc_info=True)
                return {"status": "error", "message": str(e)}

simulator = SimulationEngine()
