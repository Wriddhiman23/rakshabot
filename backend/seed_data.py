import sys
import os
import json
import datetime

# Ensure backend dir is on path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from database import engine, SessionLocal, init_db
from models import Unit, Mission, Victim, HazardZone, MissionLog, CommsMessage

def clear_database(db: Session):
    """Clears all records for clean re-seeding"""
    db.query(CommsMessage).delete()
    db.query(MissionLog).delete()
    db.query(Mission).delete()
    db.query(Victim).delete()
    db.query(HazardZone).delete()
    db.query(Unit).delete()
    db.commit()

def seed_database(db: Session, force: bool = False):
    """Loads current demo data into the database"""
    init_db()

    existing_units = db.query(Unit).count()
    if existing_units > 0 and not force:
        print(f"Database already contains {existing_units} units and demo records. (Pass force=True to wipe and re-seed)")
        return

    if force and existing_units > 0:
        print("Resetting database records...")
        clear_database(db)

    print("Seeding initial RakshaBot operational demo data...")

    # Base Camp reference: Lat 9.9850, Lng 76.2950 (NDRF Base 04, Kochi Periyar Sector)
    units_data = [
        Unit(
            callsign="Garuda-01",
            unit_type="drone",
            model_name="Garuda Heavy-Lift Hexa (Medic)",
            status="IDLE",
            latitude=9.9850,
            longitude=76.2950,
            altitude=0.0,
            speed=0.0,
            battery=96.0,
            signal_dbm=-62,
            heading_deg=45.0,
            payload_capacity_kg=6.0,
            current_payload="AED (Automated External Defibrillator)",
            payload_status="LOADED",
            camera_active=True,
            detection_label="Standby at Base Helipad 1",
            home_lat=9.9850,
            home_lng=76.2950
        ),
        Unit(
            callsign="Garuda-02",
            unit_type="drone",
            model_name="Garuda Medic-X4 Rapid Responder",
            status="IDLE",
            latitude=9.9850,
            longitude=76.2950,
            altitude=0.0,
            speed=0.0,
            battery=89.0,
            signal_dbm=-68,
            heading_deg=110.0,
            payload_capacity_kg=4.0,
            current_payload="Trauma Kit & Burn Dressing",
            payload_status="LOADED",
            camera_active=True,
            detection_label="Standby at Base Helipad 2",
            home_lat=9.9850,
            home_lng=76.2950
        ),
        Unit(
            callsign="Netra-01",
            unit_type="drone",
            model_name="Netra Thermal Recon V2",
            status="EN_ROUTE",
            latitude=10.0050,
            longitude=76.3300,
            altitude=72.0,
            speed=18.5,
            battery=82.0,
            signal_dbm=-74,
            heading_deg=220.0,
            payload_capacity_kg=2.5,
            current_payload="Dual FLIR Thermal Pod",
            payload_status="LOADED",
            camera_active=True,
            detection_label="Active Thermal Scan: Sector Delta",
            home_lat=9.9850,
            home_lng=76.2950
        ),
        Unit(
            callsign="Netra-02",
            unit_type="drone",
            model_name="Netra Lifeline Heavy Carrier",
            status="IDLE",
            latitude=9.9850,
            longitude=76.2950,
            altitude=0.0,
            speed=0.0,
            battery=92.0,
            signal_dbm=-64,
            heading_deg=90.0,
            payload_capacity_kg=8.0,
            current_payload="Antivenom & EpiPen Injectors",
            payload_status="LOADED",
            camera_active=True,
            detection_label="Standby at Base Cargo Bay",
            home_lat=9.9850,
            home_lng=76.2950
        ),
        Unit(
            callsign="Ashwa-01",
            unit_type="ground_robot",
            model_name="Ashwa All-Terrain 6x6 Rover",
            status="IDLE",
            latitude=9.9980,
            longitude=76.3120,
            altitude=0.0,
            speed=0.0,
            battery=79.0,
            signal_dbm=-70,
            heading_deg=180.0,
            payload_capacity_kg=50.0,
            current_payload="Emergency Rations, Clean Water, Radios",
            payload_status="LOADED",
            camera_active=True,
            detection_label="Forward Staging Area 2",
            home_lat=9.9850,
            home_lng=76.2950
        ),
        Unit(
            callsign="Varun-01",
            unit_type="ground_robot",
            model_name="Varun Amphibious Life-Rescue UGV",
            status="IDLE",
            latitude=9.9830,
            longitude=76.2750,
            altitude=0.0,
            speed=0.0,
            battery=86.0,
            signal_dbm=-67,
            heading_deg=315.0,
            payload_capacity_kg=40.0,
            current_payload="Inflatable Life Raft & Float Ropes",
            payload_status="LOADED",
            camera_active=True,
            detection_label="Marine Jetty Sector 1",
            home_lat=9.9850,
            home_lng=76.2950
        ),
    ]

    for unit in units_data:
        db.add(unit)
    db.commit()
    print("  -> Units added: Garuda-01, Garuda-02, Netra-01, Netra-02, Ashwa-01, Varun-01")

    # Seed initial victims
    now = datetime.datetime.utcnow()
    victims_data = [
        Victim(
            victim_code="VIC-101",
            name="Ramesh Pillai (62M)",
            condition="Acute Cardiac Event / Unconscious",
            priority="CRITICAL",
            latitude=9.9925,
            longitude=76.3075,
            landmark="Sector 3 Community Center Porch",
            detected_at=now - datetime.timedelta(minutes=8),
            status="AWAITING_RESCUE",
            detected_by_unit="Garuda-02",
            confidence_score=94.5,
            thermal_signature="36.4°C Weak Pulse Pattern",
            vitals_summary="Bystanders performing irregular chest compressions, AED urgently needed."
        ),
        Victim(
            victim_code="VIC-102",
            name="Ananya Nair & Infant (Flood Stranded)",
            condition="Submerged Access / Stranded on Terrace",
            priority="HIGH",
            latitude=10.0125,
            longitude=76.3540,
            landmark="Aluva Riverbank Two-Story Residence",
            detected_at=now - datetime.timedelta(minutes=18),
            status="DETECTED",
            detected_by_unit="Netra-01",
            confidence_score=92.1,
            thermal_signature="37.0°C Stable Dual Heat Signature",
            vitals_summary="Waving orange cloth, clean drinking water and baby formula needed."
        ),
        Victim(
            victim_code="VIC-103",
            name="Rajesh K. & Colleague (Crush Injury)",
            condition="Structural Collapse / Lower Limb Entrapped",
            priority="CRITICAL",
            latitude=10.0460,
            longitude=76.3230,
            landmark="Kalamassery Warehouse Sector G",
            detected_at=now - datetime.timedelta(minutes=35),
            status="AWAITING_RESCUE",
            detected_by_unit="Netra-01",
            confidence_score=89.7,
            thermal_signature="36.8°C Restricted Blood Flow",
            vitals_summary="Conscious, severe bleeding controlled partially with tourniquet."
        ),
        Victim(
            victim_code="VIC-104",
            name="Sunil & Soman (Snakebite Encounter)",
            condition="Russell's Viper Envenomation / Severe Swelling",
            priority="HIGH",
            latitude=9.9995,
            longitude=76.2640,
            landmark="Vallarpadam Wetland Dykes Near Bridge",
            detected_at=now - datetime.timedelta(minutes=4),
            status="DETECTED",
            detected_by_unit="Garuda-02",
            confidence_score=95.8,
            thermal_signature="38.2°C Localized Inflammation",
            vitals_summary="Polyvalent antivenom and epinephrine pack required immediately."
        ),
    ]

    for victim in victims_data:
        db.add(victim)
    db.commit()
    print("  -> Victims added: VIC-101, VIC-102, VIC-103, VIC-104")

    # Seed Hazard Zones
    flood_coords = [
        [10.0050, 76.3400],
        [10.0250, 76.3650],
        [10.0180, 76.3800],
        [9.9980, 76.3550],
        [10.0050, 76.3400]
    ]
    collapse_coords = [
        [10.0400, 76.3150],
        [10.0520, 76.3200],
        [10.0490, 76.3320],
        [10.0380, 76.3250],
        [10.0400, 76.3150]
    ]
    power_coords = [
        [9.9900, 76.2550],
        [10.0050, 76.2600],
        [10.0020, 76.2720],
        [9.9880, 76.2680],
        [9.9900, 76.2550]
    ]

    hazard_zones = [
        HazardZone(
            name="Periyar Basin Severe Inundation Zone",
            hazard_type="FLOOD_INUNDATION",
            severity="CRITICAL",
            coordinates_json=json.dumps(flood_coords),
            description="Water level 2.8m above danger mark. Strong river current. Boat/drone rescue only."
        ),
        HazardZone(
            name="Kalamassery Industrial Collapse Zone",
            hazard_type="STRUCTURAL_COLLAPSE",
            severity="WARNING",
            coordinates_json=json.dumps(collapse_coords),
            description="Unstable masonry and secondary roof collapse risk. Restricted airspace below 30m."
        ),
        HazardZone(
            name="Vallarpadam High-Tension Corridor",
            hazard_type="ELECTRICAL_HAZARD",
            severity="CAUTION",
            coordinates_json=json.dumps(power_coords),
            description="220kV transmission line crossing. Maintain minimum 40m altitude clearance."
        ),
    ]

    for hz in hazard_zones:
        db.add(hz)
    db.commit()
    print("  -> Hazard zones added: Periyar Flood Zone, Kalamassery Collapse, Vallarpadam Power Corridor")

    # Seed Past Completed Missions for rich analytics
    garuda_01 = db.query(Unit).filter_by(callsign="Garuda-01").first()
    garuda_02 = db.query(Unit).filter_by(callsign="Garuda-02").first()
    ashwa_01 = db.query(Unit).filter_by(callsign="Ashwa-01").first()

    completed_missions = [
        Mission(
            mission_number="MSN-2026-077",
            title="Emergency AED Delivery - Marine Drive Pier",
            incident_type="cardiac",
            priority="CRITICAL",
            status="COMPLETED",
            unit_id=garuda_01.id,
            target_lat=9.9780,
            target_lng=76.2790,
            target_landmark="Marine Drive Promenade Walkway",
            payload_item="AED (Automated External Defibrillator)",
            dispatched_at=now - datetime.timedelta(hours=4, minutes=12),
            arrived_at=now - datetime.timedelta(hours=4, minutes=9, seconds=45),
            delivered_at=now - datetime.timedelta(hours=4, minutes=9, seconds=10),
            completed_at=now - datetime.timedelta(hours=4, minutes=2),
            response_time_seconds=135,
            notes="AED delivered in 2m 15s. Shock delivered by bystander nurse. Patient revived and stabilized."
        ),
        Mission(
            mission_number="MSN-2026-078",
            title="Antivenom Airdrop - Cherai Coastal Belt",
            incident_type="snakebite",
            priority="HIGH",
            status="COMPLETED",
            unit_id=garuda_02.id,
            target_lat=10.0200,
            target_lng=76.2850,
            target_landmark="Cherai Fisherman Colony",
            payload_item="Antivenom & EpiPen Injectors",
            dispatched_at=now - datetime.timedelta(hours=3, minutes=20),
            arrived_at=now - datetime.timedelta(hours=3, minutes=17, seconds=20),
            delivered_at=now - datetime.timedelta(hours=3, minutes=16, seconds=50),
            completed_at=now - datetime.timedelta(hours=3, minutes=10),
            response_time_seconds=160,
            notes="Vial intact, administered by local primary health worker on site."
        ),
        Mission(
            mission_number="MSN-2026-079",
            title="Trauma Hemostatic Pack Drop - Pipeline Road",
            incident_type="trauma",
            priority="HIGH",
            status="COMPLETED",
            unit_id=garuda_02.id,
            target_lat=10.0120,
            target_lng=76.3150,
            target_landmark="NH-544 Bypass Bridge",
            payload_item="Trauma Kit & Burn Dressing",
            dispatched_at=now - datetime.timedelta(hours=2, minutes=5),
            arrived_at=now - datetime.timedelta(hours=2, minutes=2, seconds=30),
            delivered_at=now - datetime.timedelta(hours=2, minutes=2, seconds=10),
            completed_at=now - datetime.timedelta(hours=1, minutes=52),
            response_time_seconds=150,
            notes="Tourniquet and Celox clotting gauze deployed to road accident triage team."
        ),
        Mission(
            mission_number="MSN-2026-080",
            title="Heavy Water & Ration Supply - Isolated Hamlet",
            incident_type="flood",
            priority="MEDIUM",
            status="COMPLETED",
            unit_id=ashwa_01.id,
            target_lat=10.0080,
            target_lng=76.3200,
            target_landmark="Periyar Embankment Relief Camp",
            payload_item="Emergency Rations, Clean Water, Radios",
            dispatched_at=now - datetime.timedelta(hours=1, minutes=45),
            arrived_at=now - datetime.timedelta(hours=1, minutes=36),
            delivered_at=now - datetime.timedelta(hours=1, minutes=34),
            completed_at=now - datetime.timedelta(hours=1, minutes=15),
            response_time_seconds=540,
            notes="Ashwa-01 ground rover navigated 1.2m mud slope to supply 50kg supplies."
        ),
    ]

    for m in completed_missions:
        db.add(m)
    db.commit()
    print("  -> Completed historical missions added: 4 records")

    # Seed initial Mission Logs
    logs_data = [
        MissionLog(
            timestamp=now - datetime.timedelta(minutes=45),
            event_type="ALERT",
            unit_callsign="System",
            message="NDRF Operations Command Kerala Region 04 online. 6 autonomous responders active.",
            level="SUCCESS"
        ),
        MissionLog(
            timestamp=now - datetime.timedelta(minutes=35),
            event_type="DETECTION",
            unit_callsign="Netra-01",
            message="AI Vision detected trapped individual at Kalamassery Collapse (91% confidence).",
            level="WARNING"
        ),
        MissionLog(
            timestamp=now - datetime.timedelta(minutes=18),
            event_type="DETECTION",
            unit_callsign="Netra-01",
            message="Thermal Signature VIC-102 spotted on Aluva terrace. Water level rising.",
            level="CRITICAL"
        ),
        MissionLog(
            timestamp=now - datetime.timedelta(minutes=8),
            event_type="ALERT",
            unit_callsign="Garuda-02",
            message="Cardiac emergency alert registered for Sector 3 Community Hall. High priority.",
            level="CRITICAL"
        ),
        MissionLog(
            timestamp=now - datetime.timedelta(minutes=4),
            event_type="DETECTION",
            unit_callsign="Garuda-02",
            message="Victim VIC-104 detected with Russell's Viper bite symptoms in Vallarpadam marsh.",
            level="WARNING"
        ),
    ]

    for log in logs_data:
        db.add(log)
    db.commit()
    print("  -> Initial mission logs added: 5 records")

    # Seed Comms Messages
    comms_data = [
        CommsMessage(
            timestamp=now - datetime.timedelta(minutes=15),
            channel="GARUDA-01-LINK",
            sender="Command Center (Dispatcher)",
            recipient="Garuda-01",
            message="Garuda-01 pre-flight check nominal. AED battery at 100%. Standing by for scramble.",
            is_audio=False,
            is_from_drone=False
        ),
        CommsMessage(
            timestamp=now - datetime.timedelta(minutes=12),
            channel="GARUDA-01-LINK",
            sender="Garuda-01 (Drone Audio Pod)",
            recipient="Ground / Command",
            message="[Automated Telemetry] Audio speaker 120dB verified. GPS RTK lock: 14 satellites.",
            is_audio=False,
            is_from_drone=True
        ),
        CommsMessage(
            timestamp=now - datetime.timedelta(minutes=6),
            channel="NETRA-01-LINK",
            sender="Capt. Vikram Rathore (Rescue Lead)",
            recipient="Aluva Flood Victims",
            message="Netra-01 drone speaker broadcast: 'NDRF drone overhead. Stay on the terrace roof. Rescue boat and relief supplies are incoming.'",
            is_audio=True,
            is_from_drone=False
        ),
        CommsMessage(
            timestamp=now - datetime.timedelta(minutes=5),
            channel="NETRA-01-LINK",
            sender="Victim Audio Feed (Ground)",
            recipient="Command Center",
            message="[Acoustic Return] 'We can hear you! Please hurry, water is reaching second step.'",
            is_audio=True,
            is_from_drone=True
        ),
    ]

    for comm in comms_data:
        db.add(comm)
    db.commit()
    print("  -> Comms intercom records added: 4 messages")

    print("RakshaBot seed data populated successfully.")

if __name__ == "__main__":
    force_seed = "--reset" in sys.argv or "--force" in sys.argv
    with SessionLocal() as session:
        seed_database(session, force=force_seed)
