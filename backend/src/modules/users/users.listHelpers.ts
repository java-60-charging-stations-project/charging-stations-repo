import type { ListUsersFilters, UserInfo } from './users.types';

/** Apply role/status filters and pagination (RDS `get_all_users` returns full list). */
export function applyListFiltersAndPage(
  users: UserInfo[],
  filters: ListUsersFilters
): { data: UserInfo[]; totalItems: number } {
  let rows = users;
  if (filters.role?.trim()) {
    const want = filters.role.trim().toUpperCase();
    rows = rows.filter((u) => u.role.toUpperCase() === want);
  }
  if (filters.status?.trim()) {
    const want = filters.status.trim().toUpperCase();
    rows = rows.filter((u) => u.status.toUpperCase() === want);
  }
  const totalItems = rows.length;
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 200));
  const start = (page - 1) * pageSize;
  const data = rows.slice(start, start + pageSize);
  return { data, totalItems };
}
