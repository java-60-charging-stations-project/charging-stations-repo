import { getLogger } from '@/services/logging';
import { useUsersListQuery } from '@/hooks/useUsersListQuery';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState } from 'react';
import EditUserForm from '@/components/EditUserForm';
import Modal from '@/components/Modal';
import { UserStatusBadge } from '@/components/StatusBadge';
import type { ListUsersFilterKeyType, ListUsersFilterType, UserFullType } from '@/types/users';
import { userStatusTransform } from '@/services/utils';
import EasyButton from '@/components/EasyButton';

const logger = getLogger("AdminUsersPage");

const NO_FILTER_RESULTS_LABEL = "<no filters applied>";

function getResultsLabel(filter: ListUsersFilterType | null) {
  if (!filter) {
    return NO_FILTER_RESULTS_LABEL;
  }
  return `users with ${filter.filterKey}s beginning with "${filter.filterValue}"`;
}

const AdminUsersPage = () => {
  const { isLoading, error, users, hasMore, fetchMore, applyFilters, appliedFilters, modifyByIndex } = useUsersListQuery();
  const [editUserIndex, setEditUserIndex] = useState<number | null>(null);
  const [searchKey, setSearchKey] = useState<ListUsersFilterKeyType>("email");
  const [searchValue, setSearchValue] = useState<string>("");

  const resultsLabel = getResultsLabel(appliedFilters);

  const onModalClose = () => {
    setEditUserIndex(null);
  };

  const onUserUpdate = (userFull: UserFullType) => {
    logger.debug("onUserUpdate triggers, userIndex = ", editUserIndex);
    if (editUserIndex === null) {
      return;
    }
    const { enabled } = userFull;
    if ( users[editUserIndex].enabled !== enabled) {
      logger.debug("onUserUpdate modifies");
      modifyByIndex( editUserIndex, { enabled });
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
    applyFilters(searchKey, "");
  }
  
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
        <EasyButton pHeight={7} pWidth={27} onClick={handleSearchRequest}>
          Search
        </EasyButton>
        <EasyButton pHeight={7} pWidth={27} onClick={handleClearFilters}>
          Clear filters
        </EasyButton>
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
                  onClick={() => setEditUserIndex(index)}
                  className="text-blue-600 underline hover:text-blue-800 p-0 bg-transparent border-0 cursor-pointer text-left font-inherit"
                >
                  {user.email}
                </button>
              </td>
              <td>{user.name}</td>
              <td><UserStatusBadge enabled={user.enabled} /></td>
              <td>{ userStatusTransform(user.status) }</td>
            </tr>
          ))}
        </tbody>
      </table>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {hasMore && (
        <EasyButton
          onClick={fetchMore}
          disabled={isLoading}
        >
            Load more
        </EasyButton>
      )}
      <Modal
        isOpen={editUserIndex !== null}
        onClose={onModalClose}
        title="Edit User"
        showCloseButton={true}
        panelClassName="max-w-3xl"
      >
        {(editUserIndex !== null) && (
          <EditUserForm userId={users[editUserIndex].userId} onUserUpdated={onUserUpdate} />
        )}
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
