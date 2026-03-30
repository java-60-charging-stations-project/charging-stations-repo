import { getLogger } from '@/services/logging';
import { useUsersListQuery } from '@/hooks/useUsersListQuery';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useMemo, useState } from 'react';
import type { ListUsersFilterType } from '@/types/users';
import EditUserForm from '@/components/EditUserForm';
import Modal from '@/components/Modal';
import { UserStatusBadge } from '@/components/StatusBadge';

const logger = getLogger("AdminUsersPage");

function buildFilters(emailInput: string, nameInput: string): ListUsersFilterType | undefined {
  const trimmedEmail = emailInput.trim();
  const trimmedName = nameInput.trim();

  if (trimmedEmail.length > 0) {
    return {
      filterKey: 'email',
      filterValue: trimmedEmail,
    };
  }

  if (trimmedName.length > 0) {
    return {
      filterKey: 'name',
      filterValue: trimmedName,
    };
  }

  return undefined;
}

const AdminUsersPage = () => {
  const { isLoading, error, users, appliedFilters, hasMore, fetchMore, applyFilters, refresh } = useUsersListQuery();

  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const [editUserId, setEditUserId] = useState<string | null>(null);

  const onModalClose = () => {
    setEditUserId(null);
  };

  const onUserUpdated = () => {
    logger.debug('user updated, refreshing list');
    void refresh();
  };

  const draftFilters = useMemo(
    () => buildFilters(emailInput, nameInput),
    [emailInput, nameInput],
  );

  const hasPendingFilterChanges =
    draftFilters?.filterKey !== appliedFilters?.filterKey
    || draftFilters?.filterValue !== appliedFilters?.filterValue;

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
    setNameInput('');
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
    setEmailInput('');
  };

  const applyDraftFilters = () => {
    applyFilters(draftFilters);
  };

  const clearFilters = () => {
    setEmailInput('');
    setNameInput('');
    applyFilters(undefined);
  };

  const handleSetFilters = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyDraftFilters();
    }
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-center">Administrator users management</h1>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={applyDraftFilters}
          disabled={!hasPendingFilterChanges}
          className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-slate-300"
        >
          Apply filters
        </button>
        <button
          onClick={clearFilters}
          disabled={!appliedFilters && !draftFilters}
          className="bg-slate-200 text-slate-800 px-4 py-2 rounded-md disabled:bg-slate-100 disabled:text-slate-400"
        >
          Clear filters
        </button>
        <div className="text-sm text-slate-600">
          {appliedFilters
            ? `Applied filter: ${appliedFilters.filterKey} starts with "${appliedFilters.filterValue}"`
            : 'Applied filter: none'}
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th>Number</th>
            <th>Email</th>
            <th>Name</th>
            <th>Status</th>
            <th>Confirmation State</th>
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
              <span className="text-sm text-slate-500">
                {hasPendingFilterChanges ? 'Draft differs from applied filter' : 'Draft matches applied filter'}
              </span>
            </td>
          </tr>
          {users.length === 0 && !isLoading && !error && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-slate-500">
                No users found.
              </td>
            </tr>
          )}
          {users.map((user, index) => (
            <tr key={user.userId}>
              <td>{index + 1}</td>
              <td>
                <button
                  type="button"
                  onClick={() => setEditUserId(user.userId)}
                  className="text-blue-600 underline hover:text-blue-800 p-0 bg-transparent border-0 cursor-pointer text-left font-inherit"
                >
                  {user.email}
                </button>
              </td>
              <td>{user.name}</td>
              <td><UserStatusBadge enabled={user.enabled} /></td>
              <td>{user.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {hasMore && (
        <button
          onClick={fetchMore}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-slate-300"
        >
          Load more
        </button>
      )}
      <Modal
        isOpen={!!editUserId}
        onClose={onModalClose}
        title="Edit User"
        showCloseButton={true}
        panelClassName="max-w-3xl"
      >
        {editUserId && (
          <EditUserForm key={editUserId} userId={editUserId} onUserUpdated={onUserUpdated} />
        )}
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
