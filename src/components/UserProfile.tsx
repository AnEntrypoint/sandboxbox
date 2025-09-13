import React, { useState } from 'react';

export interface UserProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedAt: Date;
  updatedAt: Date;
  isActive: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showLocation: boolean;
  };
}

export interface EditableField {
  name: keyof UserProfileData;
  label: string;
  type: 'text' | 'email' | 'url' | 'textarea';
  required?: boolean;
  placeholder?: string;
  validation?: (value: string) => string | null;
}

export interface AvatarSize {
  width: number;
  height: number;
}

export interface UserProfileProps {
  user: UserProfileData;
  isEditing?: boolean;
  onEdit?: (field: keyof UserProfileData, value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  avatarSize?: AvatarSize;
  showActions?: boolean;
}

const editableFields: EditableField[] = [
  { name: 'displayName', label: 'Display Name', type: 'text', placeholder: 'How you want to be known' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'bio', label: 'Bio', type: 'textarea', placeholder: 'Tell us about yourself' },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'City, Country' },
  { name: 'website', label: 'Website', type: 'url', placeholder: 'https://your-website.com' }
];

const UserProfile: React.FC<UserProfileProps> = ({
  user,
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  avatarSize = { width: 120, height: 120 },
  showActions = true
}) => {
  const [localUser, setLocalUser] = useState<UserProfileData>(user);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleEdit = (field: keyof UserProfileData, value: string) => {
    setLocalUser(prev => ({ ...prev, [field]: value }));

    const editField = editableFields.find(f => f.name === field);
    if (editField?.validation) {
      const error = editField.validation(value);
      setErrors(prev => ({ ...prev, [field]: error || '' }));
    }

    onEdit?.(field, value);
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long'
    }).format(date);
  };

  const hasErrors = Object.values(errors).some(error => error);

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar-section">
          {localUser.avatar ? (
            <img
              src={localUser.avatar}
              alt={`${localUser.firstName} ${localUser.lastName}`}
              className="avatar"
              style={{ width: avatarSize.width, height: avatarSize.height }}
            />
          ) : (
            <div
              className="avatar-placeholder"
              style={{
                width: avatarSize.width,
                height: avatarSize.height
              }}
            >
              {getInitials(localUser.firstName, localUser.lastName)}
            </div>
          )}
          {isEditing && (
            <button className="change-avatar-btn">Change Avatar</button>
          )}
        </div>

        <div className="profile-info">
          <h1 className="display-name">
            {localUser.displayName || `${localUser.firstName} ${localUser.lastName}`}
          </h1>
          <p className="email">{localUser.email}</p>
          {localUser.location && (
            <p className="location">📍 {localUser.location}</p>
          )}
          {localUser.website && (
            <a href={localUser.website} className="website" target="_blank" rel="noopener noreferrer">
              🔗 {localUser.website}
            </a>
          )}
          <p className="joined-date">Member since {formatDate(localUser.joinedAt)}</p>
          {localUser.bio && (
            <p className="bio">{localUser.bio}</p>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="editable-fields">
          {editableFields.map(field => (
            <div key={field.name} className="field-group">
              <label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  value={(localUser[field.name] as string) || ''}
                  onChange={(e) => handleEdit(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={errors[field.name] ? 'error' : ''}
                />
              ) : (
                <input
                  type={field.type}
                  id={field.name}
                  value={(localUser[field.name] as string) || ''}
                  onChange={(e) => handleEdit(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className={errors[field.name] ? 'error' : ''}
                />
              )}
              {errors[field.name] && (
                <span className="error-message">{errors[field.name]}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {showActions && (
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button
                className="save-btn"
                onClick={onSave}
                disabled={hasErrors}
              >
                Save Changes
              </button>
              <button className="cancel-btn" onClick={onCancel}>
                Cancel
              </button>
            </>
          ) : (
            <button className="edit-btn" onClick={() => onEdit?.('displayName', localUser.displayName || '')}>
              Edit Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;