import { Link } from 'react-router';
//import { getLogger } from '@/services/logging';
import { useUsersListQuery } from '@/hooks/useUsersListQuery';
import { useState } from 'react';
import type { ListUsersFilterType } from '@/types/users';

//const logger = getLogger("AdminUsersPage");

const AdminUsersPage = () => {
  const { isLoading, error, users, hasMore, fetchMore, setFilters } = useUsersListQuery();
  
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
    setNameInput('');
  };
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
    setEmailInput('');
  };

  const buildFilters = (): ListUsersFilterType | undefined => {
    if (emailInput.trim().length > 0) {
      return {
        filterKey: 'email',
        filterValue: emailInput.trim(),
      };
    }
    else if (nameInput.trim().length > 0) {
      return {
        filterKey: 'name',
        filterValue: nameInput.trim(),
      };
    }
    return undefined;
  };

  const sendNewFiltersState = () => {
    if (isLoading) {
      return;
    }
    setFilters(buildFilters());
  };
  
  const handleSetFilters = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendNewFiltersState();
    };
  };

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
          <tr key="filters">
            <td> </td>
            <td>
              <input 
                type="text"
                placeholder="Email"
                className="border border-slate-300 px-1.5 py-0.5 rounded"
                value={emailInput}
                onChange={handleEmailChange}
                onKeyDown={handleSetFilters}
              />
            </td>
            <td>
              <input
                type="text"
                placeholder="Name"
                className="border border-slate-300 px-1.5 py-0.5 rounded"
                value={nameInput}
                onChange={handleNameChange}
                onKeyDown={handleSetFilters}
              />
            </td>
            <td> </td>
            <td>
              <button 
                onClick={sendNewFiltersState}
                disabled={isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded-md"
              >Set Filters</button>
            </td>
          </tr>
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
