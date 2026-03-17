import { UsersServiceLambda } from "./users.service.lambda";
import { UsersService } from "./users.types";

export function buildUsersService(): UsersService {
    return new UsersServiceLambda();
}  