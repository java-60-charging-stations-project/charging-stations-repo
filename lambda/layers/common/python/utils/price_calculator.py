from decimal import Decimal
from datetime import datetime

def calculate_price(session: dict, now: datetime, booking_timeout_minutes: int) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    tariff = Decimal(str(session["tariff"]))
    booking_price = Decimal(0)
    idle_price = Decimal(0)
    price = Decimal(0)
    max_booking_price = tariff * Decimal(str(booking_timeout_minutes))
    if session.get("time_booked_at"):
        booked_at = datetime.fromisoformat(session["time_booked_at"])
        started_charging = session.get("started_at")
        finished_booking = datetime.fromisoformat(started_charging) if started_charging else now
        booking_seconds = Decimal(str((finished_booking - booked_at).total_seconds()))
        booking_minutes = booking_seconds / Decimal(60)
        booking_price = min(booking_minutes * tariff, max_booking_price)
        price += booking_price
    energy_consumed_price = session["energy_consumed_kwh"] * tariff
    price += energy_consumed_price
    if session.get("stopped_at"):
        stopped_at = datetime.fromisoformat(session["stopped_at"])
        idle_seconds = Decimal(str((now - stopped_at).total_seconds()))
        idle_minutes = idle_seconds / Decimal(60)
        idle_price = idle_minutes * tariff
        price += idle_price
    return price.quantize(Decimal("0.01")), booking_price, energy_consumed_price, idle_price