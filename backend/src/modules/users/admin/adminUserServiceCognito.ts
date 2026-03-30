import { ADMIN_GROUP, getGroupByRole, SUPPORT_GROUP, UserRole } from '../../../common/authRoles';
import { AdminUserService } from "./adminUserServiceInterface";
import { UserFull, ListUserParameters, UserShort, UsersListResponse, ChangeRoleParameters } from './types';
import { createLogger } from '../../../utils/logger';
import { cognitoApiClient } from "../cognito/api";
import { InvalidParameterException, NotAuthorizedException, TooManyRequestsException, UserNotFoundException } from "@aws-sdk/client-cognito-identity-provider";
import { BadRequestError, ConflictError, InternalServerError, ResourceNotFoundError, TooManyRequestsError } from "../../../common/serviceErrors";
import { unpackAdminGetUserResponse, unpackListUsersResponse } from "./utils";

const MAX_LIST_USERS_REQUEST_ATTEMPTS = 10;

const logger = createLogger("AdminUserService");

function mapCognitoError(error: unknown, options?: {userId: string}) {
    logger.error("Error: ", error);
    if (error instanceof UserNotFoundException) {
        return new ResourceNotFoundError(`Cognito user id=${options?.userId ?? ""} not found`, "USER_NOT_FOUND");
    }
    else if (error instanceof TooManyRequestsException) {
        return new TooManyRequestsError("Too many Cognito requests");
    }
    else if (error instanceof NotAuthorizedException) {
        return new BadRequestError("Cognito authorization error");
    }
    else if (error instanceof InvalidParameterException) {
        return new BadRequestError(error.message);
    }
    return null;
}

export class AdminUserServiceCognito implements AdminUserService {
    async getUserRole(userId: string): Promise<UserRole> {
        try {
            logger.debug('Getting user role: ', { userId });
            const groups = await cognitoApiClient.listUserGroups(userId);
            logger.debug("Cognito response: ", groups);
            let userRole: UserRole = "USER";
            if (groups.includes(ADMIN_GROUP)) {
                userRole = "ADMIN";
            }
            else if (groups.includes(SUPPORT_GROUP)) {
                userRole = "SUPPORT";
            }
            logger.debug(`Returning user role=${userRole}`);
            return userRole;
        }
        catch (error) {
            const mappedError = mapCognitoError(error, { userId });
            if (mappedError) {
                throw mappedError;
            }
            throw new InternalServerError();
        }
    };

    async getUserById(userId: string): Promise<UserFull> {
        logger.debug('Getting user by id: ', { userId });
        const userRole = await this.getUserRole(userId);
        try {
            const cognitoResponse = await cognitoApiClient.getUser(userId);
            logger.debug('Cognito response: ', { cognitoResponse });
            const userShort = unpackAdminGetUserResponse(cognitoResponse);
            return {...userShort, role: userRole};
        } catch (error) {
            const mappedError = mapCognitoError(error, { userId });
            if (mappedError) {
                throw mappedError;
            }
            throw new InternalServerError();
        }
    }

    async listUsers(listUserParameters: ListUserParameters): Promise<UsersListResponse> {
        const { limit, filter } = listUserParameters;

        let paginationToken = listUserParameters.paginationToken;
        let users: UserShort[] = [];
        let attemptsMade: number = 0;
        let isFetchedAll: boolean = false;
        while (
            (isFetchedAll === false) &&
            (users.length < limit) &&
            (attemptsMade < MAX_LIST_USERS_REQUEST_ATTEMPTS)
            
        ) {
            const nextFetchLimit = limit - users.length;
            const parameters = {limit: nextFetchLimit, paginationToken, filter}
            try {
                attemptsMade += 1;
                logger.debug(`Listing users attempt number ${attemptsMade}. Parameters: `, { parameters });
                
                const cognitoResponse = await cognitoApiClient.listUsers(parameters);
                
                const fetchCount = cognitoResponse.Users?.length ?? 0;
                paginationToken = cognitoResponse.PaginationToken;
                logger.debug('Cognito response parameters: ', { fetchCount, paginationToken });
            
                const fetchedUsers: UserShort[] = unpackListUsersResponse(cognitoResponse);
                users = [...users, ...fetchedUsers];
                isFetchedAll = !paginationToken;
                logger.debug(`Total fetched=${users.length} in ${attemptsMade} attempts, isFetchedAll = ${isFetchedAll}`);
            }
            catch (error) {
                const mappedError = mapCognitoError(error);
                if (mappedError) {
                    throw mappedError;
                }
                throw new InternalServerError();
            }
        }
        return { users, paginationToken, attemptsMade };
    };

    async addUserToGroup(userId: string, group: string): Promise<void> {
        try {
            logger.debug('Adding user to group: ', { userId, group });
            const cognitoResponse = await cognitoApiClient.addUserToGroup(userId, group);
            logger.debug('Cognito response: ', { cognitoResponse });
        }
        catch (error) {
            const mappedError = mapCognitoError(error, { userId });
            if (mappedError) {
                throw mappedError;
            }
            throw new InternalServerError();
        }
    }

    async removeUserFromGroup(userId: string, group: string): Promise<void> {
        try {
            logger.debug('Removing user from group: ', { userId, group });
            const cognitoResponse = await cognitoApiClient.removeUserFromGroup(userId, group);
            logger.debug('Cognito response: ', { cognitoResponse });
        }
        catch (error) {
            const mappedError = mapCognitoError(error, { userId });
            if (mappedError) {
                throw mappedError;
            }
            throw new InternalServerError();
        }
    }

    async changeUserRole({ userId, oldRole, newRole }: ChangeRoleParameters): Promise<void> {
        if (newRole === "USER") {
            const group = getGroupByRole(oldRole);
            if (!group) {
                throw new BadRequestError(`Cannot infer user's current group to change ${oldRole} to ${newRole}`);
            }
            await this.removeUserFromGroup(userId, group);
        }
        else if (oldRole === "USER") {
            const group = getGroupByRole(newRole);
            if (!group) {
                throw new BadRequestError(`Cannot infer user's new group to change ${oldRole} to ${newRole}`);
            }
            await this.addUserToGroup(userId, group);
        }
        else {
            throw new BadRequestError(`Unsupported operation. Cannot change role ${oldRole} to ${newRole}`);
        }
    }

    async enableUser(userId: string): Promise<void> {
        try {
            logger.debug("Enabling user: ", { userId });
            const cognitoResponse = await cognitoApiClient.enableUser(userId);
            logger.debug('Cognito response: ', { cognitoResponse });
        }
        catch (error) {
            const mappedError = mapCognitoError(error, { userId });
            if (mappedError) {
                throw mappedError;
            }
            throw new InternalServerError();
        }
    };

    async disableUser(userId: string): Promise<void> {
        try {
            logger.debug("Disabling user: ", { userId });
            const cognitoResponse = await cognitoApiClient.disableUser(userId);
            logger.debug('Cognito response: ', { cognitoResponse });
        }
        catch (error) {
            const mappedError = mapCognitoError(error, { userId });
            if (mappedError) {
                throw mappedError;
            }
            throw new InternalServerError();
        }
    };

    async deleteUser(userId: string): Promise<void> {
        try {
            logger.debug("Deleting user: ", { userId });
            const cognitoResponse = await cognitoApiClient.deleteUser(userId);
            logger.debug('Cognito response: ', { cognitoResponse });
        }
        catch (error) {
            const mappedError = mapCognitoError(error, { userId });
            if (mappedError) {
                throw mappedError;
            }
            throw new InternalServerError();
        }
    };
    
}