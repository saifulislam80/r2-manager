import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { User, Mail, Lock, AlertCircle, Trash2, Save } from 'lucide-react';

const Profile = ({ onClose, onUpdate }) => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword && !formData.currentPassword) {
      setError('Current password is required to change password');
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        name: formData.name,
        email: formData.email
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/auth/profile`,
        updateData
      );

      setSuccess('Profile updated successfully');
      
      // Clear password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Update user in context
      await updateUser();
      
      if (onUpdate) {
        onUpdate(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setError('Password is required to delete account');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/auth/account`, {
        data: { password: deletePassword }
      });

      await logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal profile-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>My Profile</h2>
          <button onClick={onClose} className="btn-icon" disabled={loading}>
            ×
          </button>
        </div>

        <div className="profile-content">
          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-message">
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-section">
              <h3>Account Information</h3>
              
              <div className="form-group">
                <label htmlFor="name">
                  <User size={18} />
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <Mail size={18} />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Change Password (Optional)</h3>
              
              <div className="form-group">
                <label htmlFor="currentPassword">
                  <Lock size={18} />
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter current password"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">
                  <Lock size={18} />
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  disabled={loading}
                  minLength={6}
                />
                <small>Minimum 6 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <Lock size={18} />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          <div className="form-section danger-zone">
            <h3>Danger Zone</h3>
            <p className="danger-text">
              Once you delete your account, there is no going back. This will delete all your R2 accounts and data permanently.
            </p>
            
            {!showDeleteConfirm ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="btn-danger"
                disabled={loading}
              >
                <Trash2 size={18} />
                Delete Account
              </button>
            ) : (
              <div className="delete-confirm">
                <div className="form-group">
                  <label>Enter your password to confirm deletion</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={loading}
                  />
                </div>
                <div className="delete-actions">
                  <button 
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setError('');
                    }} 
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteAccount} 
                    className="btn-danger"
                    disabled={loading || !deletePassword}
                  >
                    {loading ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;