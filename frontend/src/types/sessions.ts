export type SessionState = 'BOOKED' | 'ACTIVE' | 'UNPAID';
export type SessionPortState = 'FREE' | 'BOOKED' | 'OCCUPIED' | 'ERROR' | 'DISABLED';

export type Session = {
    sessionId: string;
    stationId: string;
    entityKey: string;
    portCode: string;
    state: SessionState;
    userId: string;
    createdAt: string;
    updatedAt: string;
};

export type UserSessionsResponse = {
    sessions: Session[];
};

export type UserSessionPortUpdateRequest = {
    stationId: string;
    portCode: string;
    oldState: SessionPortState;
};

export type UserSessionPortUpdateResponse = {
    stationId: string;
    portCode: string;
    newState: string;
    updatedAt: string;
    timeBookedAt?: string;
    timeBookedBefore?: string;
    sessionId?: string;
};
