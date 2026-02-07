import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// R2 Account API
export const r2AccountAPI = {
  getAccounts: () => api.get('/r2accounts'),
  addAccount: (data) => api.post('/r2accounts', data),
  deleteAccount: (id) => api.delete(`/r2accounts/${id}`)
};

// R2 Operations API
export const r2OperationsAPI = {
  listBuckets: (accountId) => api.get(`/r2/${accountId}/buckets`),
  listObjects: (accountId, bucketName, params) => 
    api.get(`/r2/${accountId}/buckets/${bucketName}/objects`, { params }),
  deleteObject: (accountId, bucketName, key) => 
    api.delete(`/r2/${accountId}/buckets/${bucketName}/objects`, { params: { key } }),
  generatePresignedUrl: (accountId, bucketName, key) => 
    api.post(`/r2/${accountId}/buckets/${bucketName}/presigned-url`, { key }),
  getPublicUrl: (accountId, bucketName, key) => 
    api.get(`/r2/${accountId}/buckets/${bucketName}/public-url`, { params: { key } }),
  uploadFile: (accountId, bucketName, data) => 
    api.post(`/r2/${accountId}/buckets/${bucketName}/upload`, data),
  initiateMultipart: (accountId, bucketName, data) => 
    api.post(`/r2/${accountId}/buckets/${bucketName}/multipart/initiate`, data),
  uploadPart: (accountId, bucketName, data) => 
    api.post(`/r2/${accountId}/buckets/${bucketName}/multipart/upload-part`, data),
  completeMultipart: (accountId, bucketName, data) => 
    api.post(`/r2/${accountId}/buckets/${bucketName}/multipart/complete`, data),
  abortMultipart: (accountId, bucketName, data) => 
    api.post(`/r2/${accountId}/buckets/${bucketName}/multipart/abort`, data),
  createUploadLink: (accountId, bucketName, data) =>
    api.post(`/r2/${accountId}/buckets/${bucketName}/upload-links`, data)
};

export default api;
