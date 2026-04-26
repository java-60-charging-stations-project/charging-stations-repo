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

export type StateTransition = {
    fromState: string;
    toState: string;
};

export function unpackFailedSessionId(failedSession: Session): StateTransition | null {
    const [fromState, toState] = failedSession.sessionId.split(",");
    
    return { fromState, toState };
};

export function extractFailedSessionAction({fromState, toState}: StateTransition): string {
    if (fromState === "BOOKED" && toState === "FREE") {
        return "cancel the booking";
    }
    else if (fromState === "BOOKED" && toState === "OCCUPIED") {
        return "start charging";
    }
        else if (fromState === "FREE" && toState === "BOOKED") {
        return "book the port";
    }
    else if (fromState === "FREE" && toState === "OCCUPIED") {
        return "initiate charging";
    }
    else if (fromState === "OCCUPIED" && toState === "FREE") {
        return "stop charging";
    }
    return `change port state from ${fromState} to ${toState}`;
};

/********* Sort function for user sessions *********/
// Sort sessions by endedAt attribute desc
export function sortByEndedAt(a: Session, b: Session): number {
    return new Date(b.endedAt ?? 0).getTime() - new Date(a.endedAt ?? 0).getTime();
};

// Sort sessions by endedAt attribute desc
export function sortByCreatedAt(a: Session, b: Session): number {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// Sort recent session in PAID, UNPAID or FAILED state
const stateOrder: Record<string, number> = { FAILED: 10, UNPAID: 20, PAID: 30 };
export function sortRecentSessions(a: Session, b: Session): number {
    const statesDiff = stateOrder[a.state] - stateOrder[b.state];
    if (statesDiff !== 0) return statesDiff;
    return sortByEndedAt(a, b);
};

/********* Filter function for user sessions *********/
export function isFailedSession(s: Session): boolean {
    return s.state === "FAILED";
};

export function isActiveSession(s: Session): boolean {
    return s.state === "BOOKED" || s.state === "ACTIVE" || s.state === "UNPAID";
};

export function isRecentSession(s: Session): boolean {
    if (stateOrder[s.state] === undefined) {
        return false;
    }
    return true;
};