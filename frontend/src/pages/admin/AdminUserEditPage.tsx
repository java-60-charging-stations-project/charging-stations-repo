import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { AdminUser } from '@/types/responseTypes';
import { updateUserRole } from '@/services/api/adminApi';

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

const AdminUserEditPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const initialUser = (location.state as { user?: AdminUser })?.user ?? null;

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  if (!currentUser) {
    return (
      <div style={styles.container}>
        <p>User data not available for ID: {userId}</p>
        <button style={styles.button} onClick={() => navigate('/admin/users')}>
          Back to Users
        </button>
      </div>
    );
  }

  const availableRoles = ALL_ROLES.filter((r) => r !== currentUser.role);

  const handleCheckboxChange = (checked: boolean) => {
    setIsEditing(checked);
    setSelectedRole('');
    setMessage(null);
  };

  const handleUpdate = async () => {
    if (!selectedRole || !userId) return;
    setIsUpdating(true);
    setMessage(null);
    try {
      const updatedUser = await updateUserRole(userId, selectedRole, currentUser.updatedAt);
      setCurrentUser(updatedUser);
      setMessage('Role updated successfully');
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to update role');
      setMessageType('error');
    } finally {
      setIsUpdating(false);
      setIsEditing(false);
      setSelectedRole('');
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

  const isUpdateEnabled = isEditing && selectedRole !== '' && !isUpdating;

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

      {message && (
        <p style={messageType === 'success' ? styles.success : styles.error}>
          {message}
        </p>
      )}

      <div style={styles.buttonRow}>
        <button style={styles.button} onClick={() => navigate('/admin/users')}>
          Back to Users
        </button>
        <button
          style={{
            ...styles.button,
            ...styles.updateButton,
            ...(isUpdateEnabled ? {} : styles.disabledButton),
          }}
          disabled={!isUpdateEnabled}
          onClick={handleUpdate}
        >
          {isUpdating ? 'Updating...' : 'Update'}
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
  error: {
    marginTop: '12px',
    color: '#c00',
  },
};

export default AdminUserEditPage;
