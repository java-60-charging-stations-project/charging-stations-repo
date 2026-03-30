export type SessionState = 'BOOKED' | 'ACTIVE' | 'UNPAID';

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
