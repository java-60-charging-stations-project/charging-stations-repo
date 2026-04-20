import { config } from "@/config/env";
import type { Session } from "@/types/sessions";

export function isFreshUnpaidSession(session: Session | null): boolean {
    if (session === null || session.state !== "UNPAID" || !session.endedAt) {
        return false;
    }

    const endedAtMs = Date.parse(session.endedAt);
    if (Number.isNaN(endedAtMs)) {
        return false;
    }

    return Date.now() - endedAtMs < config.unpaidSessionGracePeriodMs;
};

export function isStaleUnpaidSession(session: Session | null): boolean {
    if (session === null || session.state !== "UNPAID" || !session.endedAt) {
        return false;
    }

    const endedAtMs = Date.parse(session.endedAt);
    if (Number.isNaN(endedAtMs)) {
        return false;
    }

    return Date.now() - endedAtMs >= config.unpaidSessionGracePeriodMs;
};
