from typing import Literal, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserInstance(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")
    user_id: str
    full_name: str
    email: str
    phone: Optional[str]
    role: Literal["USER", "ADMIN", "SUPPORT"]
    status: Literal["ACTIVE", "BANNED", "DISABLED"] | None
    created_at: datetime
    updated_at: Optional[datetime]

class RatePlan(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")
    currencyCode: str
    currencyName: str
    peakRate: float
    offPeakRate: float

class StationInstance(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")
    id: str
    code: str
    name: str
    owner: str
    city: str
    address: str
    email: Optional[str]
    phone: Optional[str]
    siteTechnician: Optional[str]
    maxPowerKw: Optional[float]
    longitude: Optional[float]
    latitude: Optional[float]
    ports: Optional[int]
    ratePlan: Optional[RatePlan]
    status: Literal["ACTIVE", "INACTIVE", "OUT_OF_SERVICE"]
    created_at: datetime
    updated_at: Optional[datetime]

