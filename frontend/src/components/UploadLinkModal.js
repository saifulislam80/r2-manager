import React from 'react';
import { Copy } from 'lucide-react';

const UploadLinkModal = ({ data, onClose, onCopy }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      onCopy?.();
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal upload-link-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Temporary Upload Link</h2>
          <button onClick={onClose} className="btn-icon">
            <span aria-hidden="true">x</span>
          </button>
        </div>

        <div className="modal-body">
          <p>This link will expire on:</p>
          <p className="upload-link-expire">{new Date(data.expiresAt).toLocaleString()}</p>
          <div className="upload-link-box">
            <input type="text" readOnly value={data.url} />
            <button className="btn-secondary" onClick={handleCopy}>
              <Copy size={16} />
              Copy
            </button>
          </div>
          <p className="upload-link-note">
            Anyone with this link can upload files and folders without logging in.
          </p>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadLinkModal;
