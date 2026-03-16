import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchAdminUsers } from '@/services/api/adminApi';
import type { AdminUser } from '@/types/responseTypes';
import { getLogger } from '@/services/logging';

const logger = getLogger("admin");

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
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
    return <div style={styles.container}><p>Loading...</p></div>;
  }

  if (error) {
    return <div style={styles.container}><p style={styles.error}>Error: {error}</p></div>;
  }

  return (
    <div style={styles.container}>
      <h1>Users</h1>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Phone</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId} style={styles.tr}>
              <td style={styles.td}>
                <Link to={`/admin/users/${user.userId}`} state={{ user }}>{user.email}</Link>
              </td>
              <td style={styles.td}>
                <Link to={`/admin/users/${user.userId}`} state={{ user }}>{user.fullName}</Link>
              </td>
              <td style={styles.td}>{user.role}</td>
              <td style={styles.td}>{user.phone}</td>
              <td style={styles.td}>{user.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '2px solid #ddd',
    fontWeight: 600,
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '10px 16px',
  },
  error: {
    color: '#c00',
  },
};

export default AdminUsersPage;
