import { env } from "../../config/env";
import { UsersServiceLambda } from "./users.service.lambda";
import { UsersServiceAwsLocal } from "./users.service.awslocal";
import { UsersService } from "./users.types";

export function buildUsersService(): UsersService {
    if (env.environment === 'local') {
        return new UsersServiceAwsLocal();
    }
    return new UsersServiceLambda();
}  