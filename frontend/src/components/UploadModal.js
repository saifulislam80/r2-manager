import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { r2OperationsAPI } from '../services/api';

const UploadModal = ({ accountId, bucketName, onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const [key, setKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setKey(selectedFile.name);
  };

  const uploadSmallFile = async () => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result.split(',')[1];
      await r2OperationsAPI.uploadFile(accountId, bucketName, {
        key,
        data: base64Data,
        contentType: file.type
      });
      onUpload();
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const uploadLargeFile = async () => {
    // Initiate multipart upload
    const { data: initData } = await r2OperationsAPI.initiateMultipart(
      accountId,
      bucketName,
      { key, contentType: file.type }
    );
    const uploadId = initData.data.uploadId;

    const parts = [];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // Convert chunk to base64
        const base64Chunk = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          reader.readAsDataURL(chunk);
        });

        // Upload part
        const { data: partData } = await r2OperationsAPI.uploadPart(
          accountId,
          bucketName,
          {
            key,
            uploadId,
            partNumber: i + 1,
            data: base64Chunk
          }
        );

        parts.push({
          PartNumber: i + 1,
          ETag: partData.data.ETag
        });

        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Complete upload
      await r2OperationsAPI.completeMultipart(accountId, bucketName, {
        key,
        uploadId,
        parts
      });

      onUpload();
      onClose();
    } catch (error) {
      // Abort upload on error
      await r2OperationsAPI.abortMultipart(accountId, bucketName, {
        key,
        uploadId
      });
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    try {
      if (file.size < 50 * 1024 * 1024) { // < 50MB
        await uploadSmallFile();
      } else {
        await uploadLargeFile();
      }
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.error || error.message));
      setUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0 || bytes == null || isNaN(bytes)) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
      ' ' +
      sizes[i]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal upload-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload File</h2>
          <button onClick={onClose} className="btn-icon" disabled={uploading}>
            <X size={24} />
          </button>
        </div>

        <div className="upload-area">
          <input
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            id="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            <Upload size={48} />
            <span>{file ? file.name : 'Choose a file or drag it here'}</span>
            {file && <span className="file-size">{formatBytes(file.size)}</span>}
          </label>
        </div>

        {file && (
          <div className="form-group">
            <label>File Key (Path in bucket)</label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="path/to/file.ext"
              disabled={uploading}
            />
          </div>
        )}

        {uploading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}>
              {progress}%
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose} disabled={uploading} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;