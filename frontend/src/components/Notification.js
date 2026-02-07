import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const Notification = ({ message, type, onClose }) => {
  return (
    <div className={`notification ${type}`}>
      <div className="notification-content">
        {type === 'success' && <CheckCircle size={20} />}
        {type === 'error' && <AlertCircle size={20} />}
        <span>{message}</span>
      </div>
      <button onClick={onClose} className="notification-close">
        <X size={16} />
      </button>
    </div>
  );
};

export default Notification;