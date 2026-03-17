import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { AdminUser } from '@/types/responseTypes';
import { fetchAdminUserById, updateUserRole } from '@/services/api/adminApi';
import { HttpError } from '@/types/errors';

const ALL_ROLES = ['USER', 'TECH_SUPPORT', 'ADMIN'];

const fields: { label: string; key: keyof AdminUser }[] = [
  { label: 'User ID', key: 'userId' },
  { label: 'Email', key: 'email' },
  { label: 'Full Name', key: 'fullName' },
  { label: 'Role', key: 'role' },
  { label: 'Phone', key: 'phone' },
  { label: 'Status', key: 'status' },
  { label: 'Created At', key: 'createdAt' },
  { label: 'Updated At', key: 'updatedAt' },
];

type ErrorPanelState = {
  title: string;
  message: string;
  details?: string;
};

const buildErrorPanel = (error: unknown, title: string): ErrorPanelState => {
  if (error instanceof HttpError) {
    const details = [`Code: ${error.code}`];
    if (error.status) {
      details.push(`Status: ${error.status}`);
    }
    return {
      title,
      message: error.message,
      details: details.join(' | '),
    };
  }

  if (error instanceof Error) {
    return { title, message: error.message };
  }

  return { title, message: 'Unknown error' };
};

const AdminUserEditPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isRefreshingUser, setIsRefreshingUser] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorPanel, setErrorPanel] = useState<ErrorPanelState | null>(null);

  const loadUser = useCallback(async (isManualRefresh: boolean) => {
    if (!userId) {
      setCurrentUser(null);
      setErrorPanel({ title: 'Cannot load user', message: 'Missing userId in route' });
      setIsLoadingUser(false);
      setIsRefreshingUser(false);
      return;
    }

    if (isManualRefresh) {
      setIsRefreshingUser(true);
    } else {
      setIsLoadingUser(true);
    }

    try {
      const user = await fetchAdminUserById(userId);
      setCurrentUser(user);
      setErrorPanel(null);
    } catch (error) {
      setCurrentUser(null);
      setErrorPanel(buildErrorPanel(error, 'Failed to load user'));
    } finally {
      setIsLoadingUser(false);
      setIsRefreshingUser(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadUser(false);
  }, [loadUser]);

  const handleRefetchUser = async () => {
    setSuccessMessage(null);
    await loadUser(true);
  };

  if (isLoadingUser) {
    return (
      <div style={styles.container}>
        <p>Loading user...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={styles.container}>
        {errorPanel && (
          <div style={styles.errorPanel}>
            <p style={styles.errorPanelTitle}>{errorPanel.title}</p>
            <p style={styles.errorPanelMessage}>{errorPanel.message}</p>
            {errorPanel.details && <p style={styles.errorPanelDetails}>{errorPanel.details}</p>}
          </div>
        )}
        <div style={styles.buttonRow}>
          <button style={styles.button} onClick={() => navigate('/admin/users')}>
            Back to Users
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.updateButton,
              ...(isRefreshingUser ? styles.disabledButton : {}),
            }}
            disabled={isRefreshingUser}
            onClick={handleRefetchUser}
          >
            {isRefreshingUser ? 'Updating...' : 'Update User'}
          </button>
        </div>
      </div>
    );
  }

  const availableRoles = ALL_ROLES.filter((r) => r !== currentUser.role);

  const handleCheckboxChange = (checked: boolean) => {
    setIsEditing(checked);
    setSelectedRole('');
    setSuccessMessage(null);
    setErrorPanel(null);
  };

  const handleUpdate = async () => {
    if (!selectedRole || !userId) {
      return;
    }

    setIsUpdating(true);
    setSuccessMessage(null);
    setErrorPanel(null);

    try {
      await updateUserRole(userId, selectedRole, currentUser.updatedAt);
      setSuccessMessage('Role updated successfully');
      setIsEditing(false);
      setSelectedRole('');
      await loadUser(true);
    } catch (error) {
      setErrorPanel(buildErrorPanel(error, 'Failed to update role'));
    } finally {
      setIsUpdating(false);
    }
  };

  const renderRoleCell = () => (
    <td style={styles.valueCell}>
      <div style={styles.roleRow}>
        <span>{currentUser.role}</span>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isEditing}
            disabled={isUpdating}
            onChange={(e) => handleCheckboxChange(e.target.checked)}
          />
          Change
        </label>
        {isEditing && (
          <select
            style={styles.select}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">-- select role --</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
      </div>
    </td>
  );

  const isRoleUpdateEnabled = isEditing && selectedRole !== '' && !isUpdating && !isRefreshingUser;
  const isRefetchBlocked = isRefreshingUser || isUpdating;

  return (
    <div style={styles.container}>
      <h1>{currentUser.fullName}</h1>
      <table style={styles.table}>
        <tbody>
          {fields.map(({ label, key }) => (
            <tr key={key} style={styles.tr}>
              <td style={styles.labelCell}>{label}</td>
              {key === 'role' ? renderRoleCell() : (
                <td style={styles.valueCell}>{currentUser[key]}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {successMessage && <p style={styles.success}>{successMessage}</p>}

      {errorPanel && (
        <div style={styles.errorPanel}>
          <p style={styles.errorPanelTitle}>{errorPanel.title}</p>
          <p style={styles.errorPanelMessage}>{errorPanel.message}</p>
          {errorPanel.details && <p style={styles.errorPanelDetails}>{errorPanel.details}</p>}
        </div>
      )}

      <div style={styles.buttonRow}>
        <button style={styles.button} onClick={() => navigate('/admin/users')}>
          Back to Users
        </button>
        <button
          style={{
            ...styles.button,
            ...styles.updateButton,
            ...(isRefetchBlocked ? styles.disabledButton : {}),
          }}
          disabled={isRefetchBlocked}
          onClick={handleRefetchUser}
        >
          {isRefreshingUser ? 'Updating...' : 'Update User'}
        </button>
        <button
          style={{
            ...styles.button,
            ...styles.updateButton,
            ...(isRoleUpdateEnabled ? {} : styles.disabledButton),
          }}
          disabled={!isRoleUpdateEnabled}
          onClick={handleUpdate}
        >
          {isUpdating ? 'Saving...' : 'Save Role'}
        </button>
      </div>
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
  tr: {
    borderBottom: '1px solid #eee',
  },
  labelCell: {
    padding: '10px 16px',
    fontWeight: 600,
    width: '180px',
    backgroundColor: '#f9f9f9',
  },
  valueCell: {
    padding: '10px 16px',
  },
  roleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  select: {
    padding: '4px 8px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  buttonRow: {
    marginTop: '24px',
    display: 'flex',
    gap: '12px',
  },
  button: {
    padding: '10px 24px',
    fontSize: '14px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
  },
  updateButton: {
    backgroundColor: '#646cff',
    color: '#fff',
    borderColor: '#646cff',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  success: {
    marginTop: '12px',
    color: '#2e7d32',
  },
  errorPanel: {
    marginTop: '14px',
    padding: '12px 14px',
    border: '1px solid #f4b4b4',
    borderRadius: '6px',
    backgroundColor: '#fff4f4',
  },
  errorPanelTitle: {
    margin: 0,
    fontWeight: 700,
    color: '#c00',
  },
  errorPanelMessage: {
    margin: '6px 0 0 0',
    color: '#5a1a1a',
  },
  errorPanelDetails: {
    margin: '6px 0 0 0',
    color: '#7a2a2a',
    fontSize: '13px',
  },
};

export default AdminUserEditPage;
