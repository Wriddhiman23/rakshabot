from typing import Optional, List
import datetime
from pydantic import BaseModel, ConfigDict

class UnitBase(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    callsign: str
    unit_type: str
    model_name: str
    status: str
    latitude: float
    longitude: float
    altitude: float
    speed: float
    battery: float
    signal_dbm: int
    heading_deg: float
    payload_capacity_kg: float
    current_payload: str
    payload_status: str
    current_mission_id: Optional[int] = None
    camera_active: bool = True
    detection_label: str = ""

class UnitResponse(UnitBase):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    home_lat: float
    home_lng: float

class MissionBase(BaseModel):
    mission_number: str
    title: str
    incident_type: str
    priority: str
    status: str
    unit_id: Optional[int] = None
    target_lat: float
    target_lng: float
    target_landmark: str
    victim_id: Optional[int] = None
    payload_item: Optional[str] = None
    notes: Optional[str] = ""

class MissionResponse(MissionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dispatched_at: datetime.datetime
    arrived_at: Optional[datetime.datetime] = None
    delivered_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    response_time_seconds: Optional[int] = None

class VictimBase(BaseModel):
    victim_code: str
    name: str
    condition: str
    priority: str
    latitude: float
    longitude: float
    landmark: str
    status: str
    detected_by_unit: str
    confidence_score: float
    thermal_signature: str
    vitals_summary: str
    assigned_mission_id: Optional[int] = None

class VictimResponse(VictimBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    detected_at: datetime.datetime

class HazardZoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    hazard_type: str
    severity: str
    coordinates_json: str
    description: str

class MissionLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mission_id: Optional[int] = None
    timestamp: datetime.datetime
    event_type: str
    unit_callsign: Optional[str] = None
    message: str
    level: str

class CommsMessageCreate(BaseModel):
    channel: str = "ALL-TACTICAL"
    sender: str = "Command Center"
    recipient: str = "On-Site / Victim"
    message: str
    is_audio: bool = False
    is_from_drone: bool = False

class CommsMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime.datetime
    channel: str
    sender: str
    recipient: str
    message: str
    is_audio: bool
    is_from_drone: bool

class EmergencyReportRequest(BaseModel):
    incident_type: str  # cardiac, trauma, flood, collapse, snakebite
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    affected_count: int = 1
    latitude: float
    longitude: float
    landmark: str
    caller_name: Optional[str] = "Emergency 112 Dispatch"
    description: Optional[str] = ""
    preferred_payload: Optional[str] = None

class MissionDispatchRequest(BaseModel):
    unit_id: int
    target_lat: float
    target_lng: float
    target_landmark: str
    incident_type: str
    priority: str = "HIGH"
    payload_item: str
    victim_id: Optional[int] = None
    title: Optional[str] = None
    notes: Optional[str] = ""

class OverrideCommandRequest(BaseModel):
    command: str  # "RECALL", "HOLD", "RTH", "DROP_PAYLOAD", "RESUME"
    unit_id: int
    reason: Optional[str] = None

class NearestUnitSuggestion(BaseModel):
    unit: UnitResponse
    distance_meters: float
    estimated_arrival_seconds: int
    suitability_score: float
    recommended_payload: str
