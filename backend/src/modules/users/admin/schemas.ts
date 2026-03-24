import { z } from "zod";

export const adminListUsersSchema = z.object({
  limit: z.coerce.number().int().positive(),
  paginationToken: z.string().min(1).optional(),
  filterKey: z.enum(["email", "name"]).optional(),
  filterValue: z.string().min(1).optional()
}).refine(
  (data) => (!!data.filterKey == !!data.filterValue),
  { message: "filterKey and filterValue must be provided together" }
);

export const adminChangeUserRoleSchema = z.object({
  oldRole: z.enum(["USER", "ADMIN", "SUPPORT"]),
  newRole: z.enum(["USER", "ADMIN", "SUPPORT"]),
}).refine(
  (data) => (data.oldRole !== data.newRole),
  {message: "The old user's role cannot be equal to the new role"}
);
