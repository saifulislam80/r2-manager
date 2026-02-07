import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload } from 'lucide-react';

const apiBase = process.env.REACT_APP_API_URL || '/api';

const PublicUpload = () => {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const expiresAtText = useMemo(() => {
    if (!info?.expiresAt) return '';
    return new Date(info.expiresAt).toLocaleString();
  }, [info]);

  useEffect(() => {
    const loadInfo = async () => {
      setError('');
      setSuccess('');
      try {
        const res = await fetch(`${apiBase}/public-upload/${token}/info`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Invalid or expired upload link');
        }
        setInfo(data.data);
      } catch (err) {
        setError(err.message);
      }
    };
    loadInfo();
  }, [token]);

  const handleFilesChange = (e) => {
    setSuccess('');
    setError('');
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const readAsBase64 = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });

  const uploadSmallFile = async (file, key) => {
    const base64Data = await readAsBase64(file);
    const res = await fetch(`${apiBase}/public-upload/${token}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        data: base64Data,
        contentType: file.type
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Failed to upload ${file.name}`);
    }
  };

  const uploadLargeFile = async (file, key) => {
    const initRes = await fetch(`${apiBase}/public-upload/${token}/multipart/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, contentType: file.type })
    });
    const initData = await initRes.json();
    if (!initRes.ok) {
      throw new Error(initData?.error || `Failed to start upload for ${file.name}`);
    }

    const uploadId = initData.data.uploadId;
    const parts = [];
    const chunkSize = 10 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const base64Chunk = await readAsBase64(chunk);

        const partRes = await fetch(`${apiBase}/public-upload/${token}/multipart/upload-part`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            uploadId,
            partNumber: i + 1,
            data: base64Chunk
          })
        });
        const partData = await partRes.json();
        if (!partRes.ok) {
          throw new Error(partData?.error || `Failed to upload part ${i + 1} for ${file.name}`);
        }

        parts.push({ PartNumber: i + 1, ETag: partData.data.ETag });
      }

      const completeRes = await fetch(`${apiBase}/public-upload/${token}/multipart/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId, parts })
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData?.error || `Failed to complete upload for ${file.name}`);
      }
    } catch (err) {
      await fetch(`${apiBase}/public-upload/${token}/multipart/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId })
      });
      throw err;
    }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setProgress({ current: 0, total: files.length });
    setSuccess('');
    setError('');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const key = file.webkitRelativePath || file.name;
        if (file.size < 50 * 1024 * 1024) {
          await uploadSmallFile(file, key);
        } else {
          await uploadLargeFile(file, key);
        }
        setProgress({ current: i + 1, total: files.length });
      }
      setSuccess('All files uploaded successfully.');
      setFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="public-upload">
      <div className="public-upload-card">
        <h1>Temporary Upload Link</h1>
        {error && <div className="alert error">{error}</div>}
        {!error && !info && <div className="loading">Loading...</div>}
        {info && (
          <>
            <div className="upload-info">
              <div>
                <span className="label">Bucket</span>
                <span className="value">{info.bucketName}</span>
              </div>
              <div>
                <span className="label">Prefix</span>
                <span className="value">{info.prefix || '/'}</span>
              </div>
              <div>
                <span className="label">Expires</span>
                <span className="value">{expiresAtText}</span>
              </div>
            </div>

            <div className="upload-area">
              <input
                type="file"
                id="public-upload-input"
                multiple
                webkitdirectory="true"
                onChange={handleFilesChange}
                disabled={uploading}
              />
              <label htmlFor="public-upload-input" className="file-label">
                <Upload size={48} />
                <span>
                  {files.length
                    ? `${files.length} file(s) selected`
                    : 'Choose files or a folder'}
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="selected-files">
                {files.slice(0, 6).map((file) => (
                  <div key={`${file.name}-${file.size}`} className="file-row">
                    <span>{file.webkitRelativePath || file.name}</span>
                    <span>{Math.round(file.size / 1024)} KB</span>
                  </div>
                ))}
                {files.length > 6 && (
                  <div className="file-row muted">+ {files.length - 6} more</div>
                )}
              </div>
            )}

            {uploading && (
              <div className="progress-line">
                Uploading {progress.current} / {progress.total}
              </div>
            )}

            {success && <div className="alert success">{success}</div>}

            <div className="public-actions">
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={!files.length || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicUpload;
