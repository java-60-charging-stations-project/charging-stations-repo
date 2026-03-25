import { Link } from 'react-router';
//import { getLogger } from '@/services/logging';
import { useUsersListQuery } from '@/hooks/useUsersListQuery';

//const logger = getLogger("AdminUsersPage");

const AdminUsersPage = () => {
  const { isLoading, error, users, hasMore, fetchMore } = useUsersListQuery();
  
  return (
    <div>
      <h1>Users</h1>
      <table  className="w-full">
        <thead>
          <tr>
            <th>Number</th>
            <th>Email</th>
            <th>Name</th>
            <th>Blocked</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.userId}>
              <td>{index + 1}</td>
              <td>
                <Link to={`/admin/users/${user.userId}`}>{user.email}</Link>
              </td>
              <td>
                <Link to={`/admin/users/${user.userId}`}>{user.name}</Link>
              </td>
              <td>{user.enabled ? 'No' : 'Yes'}</td>
              <td>{user.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <button 
        onClick={fetchMore}
        disabled={isLoading || !hasMore}
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
      >Load more</button>
    </div>
  );
};

export default AdminUsersPage;
