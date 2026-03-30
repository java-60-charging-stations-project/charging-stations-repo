import type { UserSession } from './userSessions.types';

export interface UserSessionsIService {
  getUserSessions(userId: string, callerId: string): Promise<UserSession[]>;
}
