const express = require('express');
const {
  listBuckets,
  listObjects,
  deleteObject,
  generatePresignedUrl,
  getPublicUrl,
  uploadFile,
  initiateMultipartUpload,
  uploadPart,
  completeMultipartUpload,
  abortMultipartUpload
} = require('../controllers/r2OperationsController');
const { createUploadLink } = require('../controllers/publicUploadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Bucket routes
router.get('/:accountId/buckets', listBuckets);

// Object routes
router.get('/:accountId/buckets/:bucketName/objects', listObjects);
router.delete('/:accountId/buckets/:bucketName/objects', deleteObject);
router.post('/:accountId/buckets/:bucketName/presigned-url', generatePresignedUrl);
router.get('/:accountId/buckets/:bucketName/public-url', getPublicUrl);

// Upload routes
router.post('/:accountId/buckets/:bucketName/upload', uploadFile);
router.post('/:accountId/buckets/:bucketName/multipart/initiate', initiateMultipartUpload);
router.post('/:accountId/buckets/:bucketName/multipart/upload-part', uploadPart);
router.post('/:accountId/buckets/:bucketName/multipart/complete', completeMultipartUpload);
router.post('/:accountId/buckets/:bucketName/multipart/abort', abortMultipartUpload);
router.post('/:accountId/buckets/:bucketName/upload-links', createUploadLink);

module.exports = router;
