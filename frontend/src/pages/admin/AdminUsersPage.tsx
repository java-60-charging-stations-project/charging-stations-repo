import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchAdminUsers } from '@/services/api/adminApi';
import type { AdminGetUserResponse } from '@/types/users';
import { getLogger } from '@/services/logging';

const logger = getLogger("admin");

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminGetUserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchAdminUsers();
        logger.debug("data users: ", data);
        setUsers(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (isLoading) {
    return <div><p>Loading...</p></div>;
  }

  if (error) {
    return <div><p>Error: {error}</p></div>;
  }

  return (
    <div>
      <h1>Users</h1>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId}>
              <td>
                <Link to={`/admin/users/${user.userId}`}>{user.email}</Link>
              </td>
              <td>
                <Link to={`/admin/users/${user.userId}`}>{user.username}</Link>
              </td>
              <td>{user.phone}</td>
              <td>{user.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsersPage;
