const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} = require('@aws-sdk/client-s3');
const UploadLink = require('../models/UploadLink');
const { getDecryptedCredentials } = require('./r2AccountController');

const createS3Client = (accountId, accessKeyId, secretAccessKey) => {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
};

const normalizePrefix = (prefix) => {
  if (!prefix) return '';
  const trimmed = prefix.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed ? `${trimmed}/` : '';
};

const buildKey = (prefix, key) => {
  if (!key) return null;
  const normalizedKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
  if (/(^|\/)\.\.(\/|$)/.test(normalizedKey)) return null;
  return `${normalizePrefix(prefix)}${normalizedKey}`;
};

const getUploadLinkByToken = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return UploadLink.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() }
  });
};

// @desc    Create a temporary upload link
// @route   POST /api/r2/:accountId/buckets/:bucketName/upload-links
// @access  Private
exports.createUploadLink = async (req, res) => {
  try {
    const { expiresInHours = 24, prefix = '' } = req.body || {};
    const hours = Number(expiresInHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      return res.status(400).json({
        success: false,
        error: 'expiresInHours must be a positive number'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);
    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await UploadLink.create({
      user: req.user.id,
      account: req.params.accountId,
      bucketName: req.params.bucketName,
      prefix: normalizePrefix(prefix),
      tokenHash,
      expiresAt
    });

    const baseUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000')
      .replace(/\/+$/, '');
    const url = `${baseUrl}/upload/${rawToken}`;

    res.status(201).json({
      success: true,
      data: {
        url,
        expiresAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    Get public upload link info
// @route   GET /api/public-upload/:token/info
// @access  Public
exports.getUploadLinkInfo = async (req, res) => {
  try {
    const link = await getUploadLinkByToken(req.params.token);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired upload link'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        bucketName: link.bucketName,
        prefix: link.prefix,
        expiresAt: link.expiresAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    Public upload for small files
// @route   POST /api/public-upload/:token/upload
// @access  Public
exports.publicUploadFile = async (req, res) => {
  try {
    const { key, data, contentType } = req.body;
    if (!key || !data) {
      return res.status(400).json({
        success: false,
        error: 'Key and data are required'
      });
    }

    const link = await getUploadLinkByToken(req.params.token);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired upload link'
      });
    }

    const finalKey = buildKey(link.prefix, key);
    if (!finalKey) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file key'
      });
    }

    const credentials = await getDecryptedCredentials(link.user, link.account);
    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const client = createS3Client(
      credentials.accountId,
      credentials.accessKeyId,
      credentials.secretAccessKey
    );

    const buffer = Buffer.from(data, 'base64');

    const command = new PutObjectCommand({
      Bucket: link.bucketName,
      Key: finalKey,
      Body: buffer,
      ContentType: contentType
    });

    await client.send(command);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    Initiate public multipart upload
// @route   POST /api/public-upload/:token/multipart/initiate
// @access  Public
exports.publicInitiateMultipartUpload = async (req, res) => {
  try {
    const { key, contentType } = req.body;
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key is required'
      });
    }

    const link = await getUploadLinkByToken(req.params.token);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired upload link'
      });
    }

    const finalKey = buildKey(link.prefix, key);
    if (!finalKey) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file key'
      });
    }

    const credentials = await getDecryptedCredentials(link.user, link.account);
    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const client = createS3Client(
      credentials.accountId,
      credentials.accessKeyId,
      credentials.secretAccessKey
    );

    const command = new CreateMultipartUploadCommand({
      Bucket: link.bucketName,
      Key: finalKey,
      ContentType: contentType
    });

    const response = await client.send(command);

    res.status(200).json({
      success: true,
      data: { uploadId: response.UploadId }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    Upload public multipart part
// @route   POST /api/public-upload/:token/multipart/upload-part
// @access  Public
exports.publicUploadPart = async (req, res) => {
  try {
    const { key, uploadId, partNumber, data } = req.body;
    if (!key || !uploadId || !partNumber || !data) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const link = await getUploadLinkByToken(req.params.token);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired upload link'
      });
    }

    const finalKey = buildKey(link.prefix, key);
    if (!finalKey) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file key'
      });
    }

    const credentials = await getDecryptedCredentials(link.user, link.account);
    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const client = createS3Client(
      credentials.accountId,
      credentials.accessKeyId,
      credentials.secretAccessKey
    );

    const buffer = Buffer.from(data, 'base64');

    const command = new UploadPartCommand({
      Bucket: link.bucketName,
      Key: finalKey,
      UploadId: uploadId,
      PartNumber: parseInt(partNumber),
      Body: buffer
    });

    const response = await client.send(command);

    res.status(200).json({
      success: true,
      data: { ETag: response.ETag }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    Complete public multipart upload
// @route   POST /api/public-upload/:token/multipart/complete
// @access  Public
exports.publicCompleteMultipartUpload = async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body;
    if (!key || !uploadId || !parts) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const link = await getUploadLinkByToken(req.params.token);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired upload link'
      });
    }

    const finalKey = buildKey(link.prefix, key);
    if (!finalKey) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file key'
      });
    }

    const credentials = await getDecryptedCredentials(link.user, link.account);
    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const client = createS3Client(
      credentials.accountId,
      credentials.accessKeyId,
      credentials.secretAccessKey
    );

    const command = new CompleteMultipartUploadCommand({
      Bucket: link.bucketName,
      Key: finalKey,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts }
    });

    const response = await client.send(command);

    res.status(200).json({
      success: true,
      data: { location: response.Location }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    Abort public multipart upload
// @route   POST /api/public-upload/:token/multipart/abort
// @access  Public
exports.publicAbortMultipartUpload = async (req, res) => {
  try {
    const { key, uploadId } = req.body;
    if (!key || !uploadId) {
      return res.status(400).json({
        success: false,
        error: 'Key and uploadId are required'
      });
    }

    const link = await getUploadLinkByToken(req.params.token);
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired upload link'
      });
    }

    const finalKey = buildKey(link.prefix, key);
    if (!finalKey) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file key'
      });
    }

    const credentials = await getDecryptedCredentials(link.user, link.account);
    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const client = createS3Client(
      credentials.accountId,
      credentials.accessKeyId,
      credentials.secretAccessKey
    );

    const command = new AbortMultipartUploadCommand({
      Bucket: link.bucketName,
      Key: finalKey,
      UploadId: uploadId
    });

    await client.send(command);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};
