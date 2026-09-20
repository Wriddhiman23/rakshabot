import asyncio
import math
import datetime
import logging
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

class SimulationEngine:
    def __init__(self):
        self.is_running = False
        self.tick_rate = 1.0  # seconds per simulation tick
        self.demo_task = None
        self.demo_active = False
        self.demo_step = ""

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
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
        db: Session = SessionLocal()
        try:
            units = db.query(Unit).all()
            updated_units = []

            for unit in units:
                if unit.status == "OFFLINE":
                    continue

                # Check if unit has an active mission
                active_mission = None
                if unit.current_mission_id:
                    active_mission = db.query(Mission).filter_by(id=unit.current_mission_id).first()

                # State: EN_ROUTE
                if unit.status == "EN_ROUTE" and active_mission:
                    dist = calculate_distance_meters(unit.latitude, unit.longitude, active_mission.target_lat, active_mission.target_lng)
                    bearing = calculate_bearing(unit.latitude, unit.longitude, active_mission.target_lat, active_mission.target_lng)
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
                        unit.latitude = active_mission.target_lat
                        unit.longitude = active_mission.target_lng
                        unit.status = "ON_SITE"
                        unit.speed = 1.0 if unit.unit_type == "drone" else 0.0
                        if unit.unit_type == "drone":
                            unit.altitude = 18.0  # Descend to payload release altitude

                        active_mission.status = "ON_SITE"
                        active_mission.arrived_at = datetime.datetime.utcnow()

                        log = MissionLog(
                            mission_id=active_mission.id,
                            event_type="TELEMETRY",
                            unit_callsign=unit.callsign,
                            message=f"{unit.callsign} reached target destination: {active_mission.target_landmark}. Altitude adjusted to 18m.",
                            level="SUCCESS"
                        )
                        db.add(log)
                        await manager.broadcast("MISSION_UPDATE", {
                            "mission_id": active_mission.id,
                            "status": "ON_SITE",
                            "message": f"{unit.callsign} has arrived on site at {active_mission.target_landmark}"
                        })
                    else:
                        # Move fraction of distance
                        fraction = step_meters / dist
                        unit.latitude += (active_mission.target_lat - unit.latitude) * fraction
                        unit.longitude += (active_mission.target_lng - unit.longitude) * fraction

                # State: ON_SITE
                elif unit.status == "ON_SITE" and active_mission:
                    unit.battery = max(5.0, unit.battery - 0.02)
                    if active_mission.status == "ON_SITE":
                        # Deploy payload
                        active_mission.status = "PAYLOAD_DELIVERED"
                        active_mission.delivered_at = datetime.datetime.utcnow()
                        if active_mission.dispatched_at:
                            delta = (active_mission.delivered_at - active_mission.dispatched_at).total_seconds()
                            active_mission.response_time_seconds = int(delta)

                        unit.payload_status = "DEPLOYED"

                        if active_mission.victim_id:
                            victim = db.query(Victim).filter_by(id=active_mission.victim_id).first()
                            if victim:
                                victim.status = "FIRST_AID_DROPPED"

                        log = MissionLog(
                            mission_id=active_mission.id,
                            event_type="PAYLOAD_DROP",
                            unit_callsign=unit.callsign,
                            message=f"Payload [{active_mission.payload_item}] successfully air-dropped with precision tether at {active_mission.target_landmark}.",
                            level="CRITICAL"
                        )
                        db.add(log)

                        # Auto Comms announcement
                        comm = CommsMessage(
                            channel=f"{unit.callsign.upper()}-LINK",
                            sender=f"{unit.callsign} (Automated Drone PA)",
                            recipient="Victim / Ground On-Site",
                            message=f"[Loudspeaker] Emergency payload {active_mission.payload_item} dropped. Follow audio instructions.",
                            is_audio=True,
                            is_from_drone=True
                        )
                        db.add(comm)

                        await manager.broadcast("PAYLOAD_DELIVERED", {
                            "mission_id": active_mission.id,
                            "unit_callsign": unit.callsign,
                            "payload": active_mission.payload_item,
                            "landmark": active_mission.target_landmark
                        })

                    elif active_mission.status == "PAYLOAD_DELIVERED":
                        # Wait 3 ticks on site then command return
                        unit.status = "RETURNING"
                        active_mission.status = "RETURNING"
                        log = MissionLog(
                            mission_id=active_mission.id,
                            event_type="TELEMETRY",
                            unit_callsign=unit.callsign,
                            message=f"Payload secured by on-site responders. {unit.callsign} initiating Return to Home (RTH).",
                            level="INFO"
                        )
                        db.add(log)

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
                        unit.payload_status = "LOADED"  # reloaded at base
                        unit.current_payload = "Standard Medical Kit" if unit.unit_type == "drone" else "Rations & Comms Pack"

                        if active_mission:
                            active_mission.status = "COMPLETED"
                            active_mission.completed_at = datetime.datetime.utcnow()
                            unit.current_mission_id = None

                            log = MissionLog(
                                mission_id=active_mission.id,
                                event_type="COMPLETION",
                                unit_callsign=unit.callsign,
                                message=f"{unit.callsign} safely touched down at NDRF Base Helipad. Mission {active_mission.mission_number} complete.",
                                level="SUCCESS"
                            )
                            db.add(log)

                            await manager.broadcast("MISSION_UPDATE", {
                                "mission_id": active_mission.id,
                                "status": "COMPLETED",
                                "message": f"Mission {active_mission.mission_number} completed. Unit {unit.callsign} is ready for redeployment."
                            })
                    else:
                        fraction = step_meters / dist
                        unit.latitude += (unit.home_lat - unit.latitude) * fraction
                        unit.longitude += (unit.home_lng - unit.longitude) * fraction

                # State: HOLDING
                elif unit.status == "HOLDING":
                    unit.speed = 0.0
                    unit.battery = max(5.0, unit.battery - 0.01)

                # State: IDLE (Charge battery slowly if at home)
                elif unit.status == "IDLE":
                    if unit.battery < 99.0:
                        unit.battery = min(100.0, round(unit.battery + 0.15, 1))

                # If unit is Netra-01 on patrol
                if unit.callsign == "Netra-01" and unit.status == "EN_ROUTE" and not active_mission:
                    # Patrol gentle circle around flood zone
                    t = datetime.datetime.utcnow().timestamp() / 25.0
                    unit.latitude = 10.0050 + 0.008 * math.sin(t)
                    unit.longitude = 76.3300 + 0.008 * math.cos(t)
                    unit.heading_deg = (math.degrees(t) + 90) % 360
                    unit.speed = 18.0
                    unit.altitude = 75.0
                    unit.battery = max(30.0, unit.battery - 0.01)

                updated_units.append({
                    "id": unit.id,
                    "callsign": unit.callsign,
                    "unit_type": unit.unit_type,
                    "status": unit.status,
                    "latitude": round(unit.latitude, 6),
                    "longitude": round(unit.longitude, 6),
                    "altitude": round(unit.altitude, 1),
                    "speed": round(unit.speed, 1),
                    "battery": round(unit.battery, 1),
                    "signal_dbm": unit.signal_dbm,
                    "heading_deg": round(unit.heading_deg, 1),
                    "payload_status": unit.payload_status,
                    "current_payload": unit.current_payload,
                    "detection_label": unit.detection_label
                })

            db.commit()

            # Broadcast high-frequency telemetry tick to all frontend clients
            await manager.broadcast("TELEMETRY_TICK", {
                "units": updated_units,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "demo_active": self.demo_active,
                "demo_step": self.demo_step
            })

        finally:
            db.close()

    async def run_demo_scenario(self):
        """
        Runs comprehensive dual demo scenario:
        Scenario 1: Urban Cardiac Emergency - 112 alert, auto-dispatch Garuda-01 AED, rapid sprint, airdrop AED, speaker broadcast.
        Scenario 2: Periyar Flood Stranded Family - Netra-01 thermal scan detects victims on rooftop, dispatches Varun-01 amphibious & Garuda-02, airdrops rations & lifejackets, two-way comms.
        """
        if self.demo_active:
            return {"status": "already_running"}

        self.demo_active = True
        asyncio.create_task(self._execute_demo_sequence())
        return {"status": "started"}

    async def _execute_demo_sequence(self):
        db: Session = SessionLocal()
        try:
            # Step 1: Cardiac Emergency Incoming
            self.demo_step = "Incoming Priority 1 Alert: Cardiac Arrest at Sector 3"
            victim_cardiac = db.query(Victim).filter_by(victim_code="VIC-101").first()
            garuda_01 = db.query(Unit).filter_by(callsign="Garuda-01").first()

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

            garuda_01.status = "EN_ROUTE"
            garuda_01.current_mission_id = cardiac_mission.id
            garuda_01.current_payload = "AED (Automated External Defibrillator)"
            garuda_01.payload_status = "IN_TRANSIT"
            garuda_01.detection_label = "En-route to Cardiac Emergency (ETA: 45s)"
            victim_cardiac.status = "DRONE_EN_ROUTE"
            victim_cardiac.assigned_mission_id = cardiac_mission.id
            db.commit()

            await manager.broadcast("MISSION_UPDATE", {
                "mission_id": cardiac_mission.id,
                "status": "EN_ROUTE",
                "message": f"Garuda-01 scrambled with AED. Estimated flight time: 38s."
            })

            # Let simulation move Garuda-01 for 10 seconds towards the site
            for _ in range(8):
                if not self.demo_active:
                    break
                await asyncio.sleep(1)

            # Step 3: Flood Rescue Detection by Netra-01
            self.demo_step = "Thermal Recon: Netra-01 detects stranded family on Aluva terrace"
            victim_flood = db.query(Victim).filter_by(victim_code="VIC-102").first()
            garuda_02 = db.query(Unit).filter_by(callsign="Garuda-02").first()
            varun_01 = db.query(Unit).filter_by(callsign="Varun-01").first()

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

            garuda_02.status = "EN_ROUTE"
            garuda_02.current_mission_id = flood_mission_drone.id
            garuda_02.current_payload = "Inflatable Lifebuoys & Baby Rations"
            garuda_02.payload_status = "IN_TRANSIT"

            varun_01.status = "EN_ROUTE"
            varun_01.current_payload = "Amphibious Extraction Team"
            db.commit()

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
        finally:
            db.close()

    async def reset_demo(self):
        """Resets units and victims to initial demo state"""
        self.demo_active = False
        self.demo_step = "Demo Reset"
        db: Session = SessionLocal()
        try:
            units = db.query(Unit).all()
            for u in units:
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
            netra = db.query(Unit).filter_by(callsign="Netra-01").first()
            if netra:
                netra.status = "EN_ROUTE"
                netra.latitude = 10.0050
                netra.longitude = 76.3300
                netra.altitude = 72.0
                netra.speed = 18.5
                netra.detection_label = "Active Thermal Scan: Sector Delta"

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

            db.commit()

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
        finally:
            db.close()

simulator = SimulationEngine()
