import React from 'react';
import { AlertCircle } from 'lucide-react';

const DeleteConfirmModal = ({ fileName, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <AlertCircle size={48} className="warning-icon" />
          <h2>Delete File?</h2>
        </div>

        <div className="modal-body">
          <p>Are you sure you want to delete this file?</p>
          <p className="file-name-confirm">{fileName}</p>
          <p className="warning-text">This action cannot be undone.</p>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} className="btn-secondary">
            No, Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger">
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;