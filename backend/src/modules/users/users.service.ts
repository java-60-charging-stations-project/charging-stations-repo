import { env } from "../../config/env";
import { UsersServiceLambda } from "./users.service.lambda";
import { UsersServiceLocal } from "./users.service.local";
import { UsersService } from "./users.types";

export function buildUsersService(): UsersService {
    if (env.environment === 'local') {
        return new UsersServiceLocal();
    }
    return new UsersServiceLambda();
}  