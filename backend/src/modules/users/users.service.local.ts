import { ResourceNotFoundError } from '../../common/serviceErrors';
import { createLogger } from '../../utils/logger';
import { ListUsersFilters, ListUsersResult, UpdateProfilePayload, UserInfo, UsersService } from './users.types';

const logger = createLogger('users.service.local', 'debug');

const userAdmin: UserInfo = {
    userId: 'id-admin',
    username: 'admin',
    email: 'admin@example.com',
    phone: '+1234567890',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: Date.now().toString()
};
const USERS: UserInfo[] = [
    userAdmin,
    {
        userId: 'id-user',
        username: 'user',
        email: 'user@example.com',
        phone: '+1234567890',
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now().toString()
    },
    {
        userId: 'id-tech-support',
        username: 'tech-support',
        email: 'tech-support@example.com',
        phone: '+1234567890',
        role: 'tech-support',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now().toString()
    },
];

export class UsersServiceLocal implements UsersService {
    constructor() {
        logger.debug('UsersServiceLocal constructor');
    }
    async getMyInfo(userId: string): Promise<UserInfo> {
        logger.debug('UsersServiceLocal getMyInfo', { userId });
        return USERS.find(user => user.userId === userId) || userAdmin;
    }

    async getUserById(_adminId: string, _userId: string): Promise<UserInfo | null> {
        logger.debug('UsersServiceLocal getUserById', { _adminId, _userId });
        const user = USERS.find(user => user.userId === _userId);
        if (!user) {
            throw new ResourceNotFoundError(`User not found: ${_userId}`);
        }
        return user;
    }

    async listUsers(_adminId: string, _filters: ListUsersFilters): Promise<ListUsersResult> {
        logger.debug('UsersServiceLocal listUsers', { _adminId, _filters });
        return {
            data: USERS,
            totalItems: USERS.length,
        }
    }

    async updateOwnProfile(_userId: string, _payload: UpdateProfilePayload): Promise<void> {
        logger.debug('UsersServiceLocal updateOwnProfile', { _userId, _payload });
    }

    async updateUserProfileAsAdmin(_adminId: string, _userId: string, _payload: UpdateProfilePayload): Promise<void> {
        logger.debug('UsersServiceLocal updateUserProfileAsAdmin', { _adminId, _userId, _payload });
        const userIndex = USERS.findIndex(user => user.userId === _userId);
        if (userIndex === -1) {
            throw new ResourceNotFoundError(`User not found: ${_userId}`);
        }
        USERS[userIndex] = {
            ...USERS[userIndex],
            ..._payload,
        };
        return;
    }

    async updateUserRole(_adminId: string, _userId: string, _role: string): Promise<void> {
        logger.debug('UsersServiceLocal updateUserRole', { _adminId, _userId, _role });
        const userIndex = USERS.findIndex(user => user.userId === _userId);
        if (userIndex === -1) {
            throw new ResourceNotFoundError(`User not found: ${_userId}`);
        }
        USERS[userIndex] = {
            ...USERS[userIndex],
            role: _role,
        };
        return;
    }

    async deleteUser(_adminId: string, _userId: string): Promise<void> {
        logger.debug('UsersServiceLocal deleteUser', { _adminId, _userId });
        const userIndex = USERS.findIndex(user => user.userId === _userId);
        if (userIndex === -1) {
            throw new ResourceNotFoundError(`User not found: ${_userId}`);
        }
        USERS.splice(userIndex, 1);
        return;
    }
}