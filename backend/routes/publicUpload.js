const express = require('express');
const {
  getUploadLinkInfo,
  publicUploadFile,
  publicInitiateMultipartUpload,
  publicUploadPart,
  publicCompleteMultipartUpload,
  publicAbortMultipartUpload
} = require('../controllers/publicUploadController');

const router = express.Router();

router.get('/:token/info', getUploadLinkInfo);
router.post('/:token/upload', publicUploadFile);
router.post('/:token/multipart/initiate', publicInitiateMultipartUpload);
router.post('/:token/multipart/upload-part', publicUploadPart);
router.post('/:token/multipart/complete', publicCompleteMultipartUpload);
router.post('/:token/multipart/abort', publicAbortMultipartUpload);

module.exports = router;
