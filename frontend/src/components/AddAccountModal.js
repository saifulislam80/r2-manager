import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

const AddAccountModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    accountId: '',
    accessKeyId: '',
    secretAccessKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onAdd(formData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add account');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Cloudflare R2 Account</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Account Name</label>
            <input
              type="text"
              name="name"
              placeholder="My Cloudflare Account"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Account ID</label>
            <input
              type="text"
              name="accountId"
              placeholder="ac1be0304272a90218d6756e2899e9a2"
              value={formData.accountId}
              onChange={handleChange}
              required
            />
            <small>32-character Cloudflare account ID</small>
          </div>

          <div className="form-group">
            <label>Access Key ID</label>
            <input
              type="text"
              name="accessKeyId"
              placeholder="R2 Access Key ID"
              value={formData.accessKeyId}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Secret Access Key</label>
            <input
              type="password"
              name="secretAccessKey"
              placeholder="R2 Secret Access Key"
              value={formData.secretAccessKey}
              onChange={handleChange}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;