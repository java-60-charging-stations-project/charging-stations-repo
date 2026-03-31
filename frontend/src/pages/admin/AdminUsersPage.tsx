import { getLogger } from '@/services/logging';
import { useUsersListQuery } from '@/hooks/useUsersListQuery';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState } from 'react';
import EditUserForm from '@/components/EditUserForm';
import Modal from '@/components/Modal';
import { UserStatusBadge } from '@/components/StatusBadge';
import type { ListUsersFilterKeyType, ListUsersFilterType, UserShortType, UserFullType } from '@/types/users';

const logger = getLogger("AdminUsersPage");

const NO_FILTER_RESULTS_LABEL = "<no filters applied>";

function getResultsLabel(filter: ListUsersFilterType | null) {
  if (!filter) {
    return NO_FILTER_RESULTS_LABEL;
  }
  return `Users with ${filter.filterKey} beginning like "${filter.filterValue}"`;
}

const AdminUsersPage = () => {
  const { isLoading, error, users, hasMore, fetchMore, applyFilters, appliedFilters, modifyById } = useUsersListQuery();
  const [editUser, setEditUser] = useState<UserShortType | null>(null);
  const [searchKey, setSearchKey] = useState<ListUsersFilterKeyType>("email");
  const [searchValue, setSearchValue] = useState<string>("");

  const onModalClose = () => {
    setEditUser(null);
  };

  const onUserUpdate = (userFull: UserFullType) => {
    logger.debug("onUserUpdate triggers");
    if (!editUser) return;
    const { enabled, status, lastModifiedDate } = userFull;
    if (
      editUser.status !== status ||
      editUser.enabled !== enabled ||
      editUser.lastModifiedDate !== lastModifiedDate
    ) {
        logger.debug("onUserUpdate modifies");
        modifyById(editUser.userId, { status, enabled, lastModifiedDate });
    }
  };

  const handleSearchRequest = () => {
    logger.debug("Fire new search");
    const normalizedValue = searchValue.trim().toLowerCase();
    applyFilters(searchKey, normalizedValue);
  }

  const handleSearchKeySelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const filterKey = event.target.value === "email" ? "email" : "name";
    setSearchKey(filterKey);
  }

  const handleSearchValueInputOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  }

  const handleSearchValueInputKeyDown  = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key == "Enter") {
      handleSearchRequest();
    }
  };

  const handleClearFilters = () => {
    setSearchValue("");
    handleSearchRequest();
  }

  const resultsLabel = getResultsLabel(appliedFilters);
  
  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-center">Administrator users management</h1>
      </div>
      <div className="mb-4 flex items-center gap-3 text-sm">
        <span>Filter users by </span>
        <select
          value={searchKey}
          onChange={handleSearchKeySelectChange}
          className="max-w-17 h-7 rounded border border-slate-300 bg-white px-0.5 py-0.5 text-sm align-middle"
        >
          <option value="email">Email</option>
          <option value="name">Name</option>
        </select>
        <span>:</span>
        <input
          type="text"
          placeholder={`Type ${searchKey} here...`}
          value={searchValue}
          className="max-w-49 h-7 rounded border border-slate-300 bg-white px-0.5 py-0.5 text-sm"
          onChange={handleSearchValueInputOnChange}
          onKeyDown={handleSearchValueInputKeyDown}
        />
        <button
          type="button"
          onClick={handleSearchRequest}
          className="h-7 w-27 rounded-md px-2.5 py-0.5 text-sm font-medium no-underline bg-slate-50 text-slate-800 hover:bg-slate-300 hover:text-black"
        >Search</button>
        <button
          type="button"
          onClick={handleClearFilters}
          className="h-7 w-27 rounded-md px-2.5 py-0.5 text-sm font-medium no-underline bg-slate-50 text-slate-800 hover:bg-slate-300 hover:text-black"
        >Clear filters</button>
      </div>
      <table className="w-full">
        <caption className="p-1 text-lg font-medium text-left">{`Results shown for: ${resultsLabel}`} </caption>
        <thead>
          <tr>
            <th>Number</th>
            <th>Email</th>
            <th>Name</th>
            <th>Status</th>
            <th>Confirmation status</th>
          </tr>
        </thead>
        <tbody>
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
                  onClick={() => setEditUser({ ...user })}
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
        isOpen={!!editUser}
        onClose={onModalClose}
        title="Edit User"
        showCloseButton={true}
        panelClassName="max-w-3xl"
      >
        {!!editUser && (
          <EditUserForm userId={editUser.userId} onUserUpdated={onUserUpdate} />
        )}
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
