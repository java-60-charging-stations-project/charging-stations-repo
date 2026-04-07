from typing import TypedDict, Optional, Literal
from datetime import datetime
from decimal import Decimal

class UserInstance(TypedDict):
    user_id: str
    full_name: str
    email: str
    phone: Optional[str]
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
    has_free_ports: bool
    created_at: datetime
    updated_at: Optional[datetime]
    event_id: Optional[str]

class PortInstance(TypedDict):
    station_id: str
    entity_key: str
    state: Literal["FREE", "OCCUPIED", "ERROR", "DISABLED", "BOOKED"]
    last_meter_kw: float | Decimal | None
    created_at: str | None
    updated_at: str | None
    last_event_id: str | None

class RequestParameters(TypedDict):
    city: Optional[str]
    owner: Optional[str]
    state: Optional[Literal["ACTIVE", "INACTIVE", "OUT_OF_SERVICE", "DELETED"]]
    page: Optional[int]
    page_size: Optional[int]

class PortSessionInstance(TypedDict):
    user_id: str
    station_id: str
    entity_key: str
    session_id: str
    state: Literal["BOOKED", "ACTIVE", "FAILED", "UNPAID", "PAID"]
    energy_consumed_kwh: float | Decimal
    tariff: float | Decimal
    current_cost: float | Decimal
    final_cost: float | Decimal
    estimated_minutes_remaining: int | None
    duration_minutes: int | None
    booking_duration_minutes: int | None
    charge_level_percent: int | None
    created_at: str
    updated_at: str | None
    time_booked_at: str | None
    time_booked_before: str | None
    started_at: str | None
    stopped_at: str | None
    ended_at: str | None
    last_event_id: str | None
    paid_at: str | None