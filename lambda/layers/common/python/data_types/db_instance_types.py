from typing import TypedDict, Optional, Literal
from datetime import datetime

class UserInstance(TypedDict):
    user_id: str
    full_name: str
    email: str
    phone: Optional[str]
    role: Literal["USER", "ADMIN", "SUPPORT"]
    status: Optional[Literal["ACTIVE", "BANNED", "DISABLED"]]
    created_at: datetime
    updated_at: Optional[datetime]

class RatePlan(TypedDict):
    currencyCode: str
    currencyName: str
    peakRate: float
    offPeakRate: float

class StationInstance(TypedDict):
    id: str
    code: str
    name: str
    owner: str
    city: str
    address: str
    email: Optional[str]
    phone: Optional[str]
    site_technician: Optional[str]
    max_power_kw: Optional[float]
    longitude: Optional[float]
    latitude: Optional[float]
    ports: Optional[int]
    rate_plan: Optional[RatePlan]
    state: Literal["ACTIVE", "INACTIVE", "OUT_OF_SERVICE", "DELETED"]
    created_at: datetime
    updated_at: Optional[datetime]

class PortInstance(TypedDict):
    station_id: str
    code: str
    entity_key: str
    state: Literal["FREE", "OCCUPIED", "ERROR", "DISABLED"]
    power: float
    last_meter_kw: float
    created_at: datetime
    updated_at: Optional[datetime]

class RequestParameters(TypedDict):
    city: Optional[str]
    owner: Optional[str]
    state: Optional[Literal["ACTIVE", "INACTIVE", "OUT_OF_SERVICE", "DELETED"]]
    page: Optional[int]
    page_size: Optional[int]
