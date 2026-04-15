import { config } from "@/config/env";
import type { Session } from "@/types/sessions";

export function isFreshUnpaidSession(session: Session): boolean {
    if (session.state !== "UNPAID" || !session.endedAt) {
        return false;
    }

    const endedAtMs = Date.parse(session.endedAt);
    if (Number.isNaN(endedAtMs)) {
        return false;
    }

    return Date.now() - endedAtMs < config.unpaidSessionGracePeriodMs;
}
