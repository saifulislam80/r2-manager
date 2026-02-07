import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { r2AccountAPI, r2OperationsAPI } from '../services/api';
import { Cloud, Plus, Trash2, Download, Upload, FolderOpen, RefreshCw, LogOut, Copy, User, Link2 } from 'lucide-react';
import Notification from './Notification';
import AddAccountModal from './AddAccountModal';
import UploadModal from './UploadModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import Profile from './Profile';
import UploadLinkModal from './UploadLinkModal';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showUploadLink, setShowUploadLink] = useState(false);
  const [uploadLinkData, setUploadLinkData] = useState(null);

  // Notifications
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await r2AccountAPI.getAccounts();
      setAccounts(res.data.data);
    } catch (error) {
      showNotification('Failed to load accounts', 'error');
    }
  }, [showNotification]);

  const addAccount = async (accountData) => {
    try {
      await r2AccountAPI.addAccount(accountData);
      showNotification('Account added successfully');
      loadAccounts();
      setShowAddAccount(false);
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async (accountId) => {
    try {
      await r2AccountAPI.deleteAccount(accountId);
      showNotification('Account deleted');
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null);
        setBuckets([]);
        setSelectedBucket(null);
        setObjects([]);
      }
      loadAccounts();
    } catch (error) {
      showNotification('Failed to delete account', 'error');
    }
  };

  const loadBuckets = useCallback(async (accountId) => {
    setLoading(true);
    try {
      const res = await r2OperationsAPI.listBuckets(accountId);
      setBuckets(res.data.data);
    } catch (error) {
      showNotification('Failed to load buckets', 'error');
    }
    setLoading(false);
  }, [showNotification]);

  const loadObjects = useCallback(async (accountId, bucketName) => {
    setLoading(true);
    try {
      const res = await r2OperationsAPI.listObjects(accountId, bucketName);
      setObjects(res.data.data.objects);
    } catch (error) {
      showNotification('Failed to load files', 'error');
    }
    setLoading(false);
  }, [showNotification]);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Load buckets when account selected
  useEffect(() => {
    if (selectedAccount) {
      loadBuckets(selectedAccount.id);
      setSelectedBucket(null);
      setObjects([]);
    }
  }, [selectedAccount, loadBuckets]);

  // Load objects when bucket selected
  useEffect(() => {
    if (selectedAccount && selectedBucket) {
      loadObjects(selectedAccount.id, selectedBucket);
    }
  }, [selectedAccount, selectedBucket, loadObjects]);

  const handleDeleteObject = async () => {
    if (!deleteConfirm) return;

    try {
      await r2OperationsAPI.deleteObject(
        selectedAccount.id,
        selectedBucket,
        deleteConfirm.key
      );
      showNotification('File deleted');
      loadObjects(selectedAccount.id, selectedBucket);
    } catch (error) {
      showNotification('Failed to delete file', 'error');
    }
    setDeleteConfirm(null);
  };

  const generateDownloadUrl = async (key) => {
    try {
      const res = await r2OperationsAPI.generatePresignedUrl(
        selectedAccount.id,
        selectedBucket,
        key
      );
      window.open(res.data.data.url, '_blank');
      showNotification('Download link generated');
    } catch (error) {
      showNotification('Failed to generate download link', 'error');
    }
  };

  const copyPublicUrl = async (key) => {
    try {
      const res = await r2OperationsAPI.getPublicUrl(
        selectedAccount.id,
        selectedBucket,
        key
      );

      if (res.data.data.publicUrl) {
        await navigator.clipboard.writeText(res.data.data.publicUrl);
        showNotification('Public URL copied to clipboard');
      } else {
        showNotification('Public Development Base URL not configured for this bucket', 'error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to get public URL';
      showNotification(errorMsg, 'error');
    }
  };

  const generateUploadLink = async () => {
    if (!selectedAccount || !selectedBucket) return;
    try {
      const res = await r2OperationsAPI.createUploadLink(
        selectedAccount.id,
        selectedBucket,
        { expiresInHours: 24 }
      );
      setUploadLinkData(res.data.data);
      setShowUploadLink(true);
      showNotification('Upload link generated');
    } catch (error) {
      showNotification('Failed to generate upload link', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatBytes = (bytes) => {
    try {
      if (!bytes || isNaN(bytes)) return '0 B';

      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return (
        Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
        ' ' +
        sizes[i]
      );
    } catch (err) {
      console.error('formatBytes error:', err);
      return '0 B';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="dashboard">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <Cloud size={32} />
            <h1>R2 Manager</h1>
          </div>
          <div className="header-actions">
            <span className="user-name">Welcome, {user?.name}</span>
            <button onClick={() => setShowProfile(true)} className="btn-secondary">
              <User size={18} />
              Profile
            </button>
            <button onClick={handleLogout} className="btn-secondary">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-header">
              <h3>Accounts</h3>
              <button onClick={() => setShowAddAccount(true)} className="btn-icon" title="Add Account">
                <Plus size={18} />
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="empty-state">
                <p>No accounts yet</p>
                <button onClick={() => setShowAddAccount(true)} className="btn-link">
                  Add your first account
                </button>
              </div>
            ) : (
              <div className="account-list">
                {accounts.map(account => (
                  <div
                    key={account.id}
                    className={`account-item ${selectedAccount?.id === account.id ? 'active' : ''}`}
                  >
                    <div
                      className="account-info"
                      onClick={() => setSelectedAccount(account)}
                    >
                      <span className="account-name">{account.name}</span>
                      <span className="account-id">{account.accountId}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this account?')) {
                          deleteAccount(account.id);
                        }
                      }}
                      className="btn-icon delete-button"
                      title="Delete account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedAccount && (
            <div className="sidebar-section">
              <div className="sidebar-header">
                <h3>Buckets</h3>
                <button
                  onClick={() => loadBuckets(selectedAccount.id)}
                  className="btn-icon"
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {loading && buckets.length === 0 ? (
                <div className="loading">Loading...</div>
              ) : buckets.length === 0 ? (
                <div className="empty-state">
                  <p>No buckets found</p>
                </div>
              ) : (
                <div className="bucket-list">
                  {buckets.map(bucket => (
                    <div
                      key={bucket.Name}
                      className={`bucket-item ${selectedBucket === bucket.Name ? 'active' : ''}`}
                      onClick={() => setSelectedBucket(bucket.Name)}
                    >
                      <FolderOpen size={18} />
                      <span>{bucket.Name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="content">
          {!selectedAccount ? (
            <div className="welcome">
              <Cloud size={64} />
              <h2>Welcome to R2 Manager</h2>
              <p>Add a Cloudflare account to get started</p>
              <button onClick={() => setShowAddAccount(true)} className="btn-primary btn-large">
                <Plus size={24} />
                Add Account
              </button>
            </div>
          ) : !selectedBucket ? (
            <div className="welcome">
              <FolderOpen size={64} />
              <h2>Select a bucket</h2>
              <p>Choose a bucket from the sidebar to view its contents</p>
            </div>
          ) : (
            <div className="files-section">
              <div className="files-header">
                <div>
                  <h2>{selectedBucket}</h2>
                  <p className="bucket-path">{selectedAccount.name} / {selectedBucket}</p>
                </div>
                <div className="files-actions">
                  <button
                    onClick={() => loadObjects(selectedAccount.id, selectedBucket)}
                    className="btn-secondary"
                  >
                    <RefreshCw size={18} />
                    Refresh
                  </button>
                  <button onClick={generateUploadLink} className="btn-secondary">
                    <Link2 size={18} />
                    Upload Link
                  </button>
                  <button onClick={() => setShowUpload(true)} className="btn-primary">
                    <Upload size={18} />
                    Upload
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading">Loading files...</div>
              ) : objects.length === 0 ? (
                <div className="empty-state">
                  <p>No files in this bucket</p>
                  <button onClick={() => setShowUpload(true)} className="btn-link">
                    Upload your first file
                  </button>
                </div>
              ) : (
                <div className="files-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Modified</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objects.map(obj => (
                        <tr key={obj.Key}>
                          <td className="file-name">{obj.Key}</td>
                          <td>{formatBytes(obj.Size)}</td>
                          <td>{formatDate(obj.LastModified)}</td>
                          <td className="file-actions">
                            <button
                              onClick={() => copyPublicUrl(obj.Key)}
                              className="btn-icon"
                              title="Copy Public URL"
                            >
                              <Copy size={18} />
                            </button>
                            <button
                              onClick={() => generateDownloadUrl(obj.Key)}
                              className="btn-icon"
                              title="Download"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ key: obj.Key, name: obj.Key })}
                              className="btn-icon btn-danger"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onAdd={addAccount}
        />
      )}

      {showUpload && selectedAccount && selectedBucket && (
        <UploadModal
          accountId={selectedAccount.id}
          bucketName={selectedBucket}
          onClose={() => setShowUpload(false)}
          onUpload={() => loadObjects(selectedAccount.id, selectedBucket)}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          fileName={deleteConfirm.name}
          onConfirm={handleDeleteObject}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {showProfile && (
        <Profile
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => {
            // User data will be automatically updated in AuthContext
            showNotification('Profile updated successfully');
          }}
        />
      )}

      {showUploadLink && uploadLinkData && (
        <UploadLinkModal
          data={uploadLinkData}
          onClose={() => {
            setShowUploadLink(false);
            setUploadLinkData(null);
          }}
          onCopy={() => showNotification('Upload link copied to clipboard')}
        />
      )}
    </div>
  );
};

export default Dashboard;
