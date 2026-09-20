import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    callsign = Column(String(50), unique=True, index=True, nullable=False)
    unit_type = Column(String(20), nullable=False)  # 'drone' | 'ground_robot'
    model_name = Column(String(100), nullable=False)
    status = Column(String(30), default="IDLE")  # IDLE, EN_ROUTE, ON_SITE, PAYLOAD_DELIVERED, RETURNING, HOLDING, OFFLINE
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, default=0.0)  # meters
    speed = Column(Float, default=0.0)  # m/s
    battery = Column(Float, default=100.0)  # percentage
    signal_dbm = Column(Integer, default=-65)  # RSSI dBm
    heading_deg = Column(Float, default=0.0)  # degrees
    payload_capacity_kg = Column(Float, default=5.0)
    current_payload = Column(String(100), default="None")
    payload_status = Column(String(30), default="LOADED")  # LOADED, IN_TRANSIT, DEPLOYED, EMPTY
    current_mission_id = Column(Integer, nullable=True)
    camera_active = Column(Boolean, default=True)
    detection_label = Column(String(150), default="Clear - Scanning Area")
    home_lat = Column(Float, default=9.9850)
    home_lng = Column(Float, default=76.2950)

    missions = relationship("Mission", back_populates="unit")


class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    mission_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(150), nullable=False)
    incident_type = Column(String(50), nullable=False)  # cardiac, trauma, flood, collapse, snakebite
    priority = Column(String(20), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(30), default="ASSIGNED")  # ASSIGNED, EN_ROUTE, ON_SITE, PAYLOAD_DELIVERED, RETURNING, COMPLETED, ABORTED, HOLDING
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    target_lat = Column(Float, nullable=False)
    target_lng = Column(Float, nullable=False)
    target_landmark = Column(String(150), nullable=False)
    victim_id = Column(Integer, ForeignKey("victims.id"), nullable=True)
    payload_item = Column(String(100), nullable=True)
    dispatched_at = Column(DateTime, default=datetime.datetime.utcnow)
    arrived_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    response_time_seconds = Column(Integer, nullable=True)
    notes = Column(Text, default="")

    unit = relationship("Unit", back_populates="missions")
    victim = relationship("Victim", back_populates="missions")


class Victim(Base):
    __tablename__ = "victims"

    id = Column(Integer, primary_key=True, index=True)
    victim_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    condition = Column(String(150), nullable=False)
    priority = Column(String(20), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    landmark = Column(String(150), nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="DETECTED")  # DETECTED, AWAITING_RESCUE, DRONE_EN_ROUTE, FIRST_AID_DROPPED, RESCUED, EVACUATED
    detected_by_unit = Column(String(50), default="Garuda-01")
    confidence_score = Column(Float, default=92.0)
    thermal_signature = Column(String(50), default="37.1°C Stable")
    vitals_summary = Column(String(200), default="Conscious, responding to drone voice link")
    assigned_mission_id = Column(Integer, nullable=True)

    missions = relationship("Mission", back_populates="victim")


class HazardZone(Base):
    __tablename__ = "hazard_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    hazard_type = Column(String(50), nullable=False)  # FLOOD_INUNDATION, STRUCTURAL_COLLAPSE, ELECTRICAL_HAZARD, HIGH_WIND
    severity = Column(String(20), default="WARNING")  # CRITICAL, WARNING, CAUTION
    coordinates_json = Column(Text, nullable=False)  # JSON array of [lat, lng]
    description = Column(String(250), default="")


class MissionLog(Base):
    __tablename__ = "mission_logs"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    event_type = Column(String(50), nullable=False)  # DISPATCH, TELEMETRY, DETECTION, PAYLOAD_DROP, OVERRIDE, COMPLETION, ALERT
    unit_callsign = Column(String(50), nullable=True)
    message = Column(String(255), nullable=False)
    level = Column(String(20), default="INFO")  # INFO, WARNING, CRITICAL, SUCCESS


class CommsMessage(Base):
    __tablename__ = "comms_messages"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    channel = Column(String(50), default="ALL-TACTICAL")
    sender = Column(String(100), nullable=False)
    recipient = Column(String(100), default="On-Site / Victim")
    message = Column(String(500), nullable=False)
    is_audio = Column(Boolean, default=False)
    is_from_drone = Column(Boolean, default=False)
