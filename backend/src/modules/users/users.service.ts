import { env } from "../../config/env";
import { UsersServiceLambda } from "./users.service.lambda";
import { UsersService } from "./users.service.interface";
import { UsersServiceLocal } from "./users.service.local";

export function buildUsersService(): UsersService {
    if (env.environment === 'local') {
        return new UsersServiceLocal();
    }
    return new UsersServiceLambda();
}  