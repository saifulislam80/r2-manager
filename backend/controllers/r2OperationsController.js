const { S3Client, ListBucketsCommand, ListObjectsV2Command, DeleteObjectCommand,
        GetObjectCommand, PutObjectCommand, CreateMultipartUploadCommand,
        UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand,
        HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getDecryptedCredentials } = require('./r2AccountController');

// Helper function to create S3 client
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

// @desc    List buckets for an R2 account
// @route   GET /api/r2/:accountId/buckets
// @access  Private
exports.listBuckets = async (req, res) => {
  try {
    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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

    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    res.status(200).json({
      success: true,
      data: response.Buckets || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    List objects in a bucket
// @route   GET /api/r2/:accountId/buckets/:bucketName/objects
// @access  Private
exports.listObjects = async (req, res) => {
  try {
    const { prefix = '', maxKeys = 1000 } = req.query;

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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

    const command = new ListObjectsV2Command({
      Bucket: req.params.bucketName,
      Prefix: prefix,
      MaxKeys: parseInt(maxKeys)
    });

    const response = await client.send(command);

    res.status(200).json({
      success: true,
      data: {
        objects: response.Contents || [],
        continuationToken: response.NextContinuationToken
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

// @desc    Delete object from bucket
// @route   DELETE /api/r2/:accountId/buckets/:bucketName/objects
// @access  Private
exports.deleteObject = async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Object key is required'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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

    const command = new DeleteObjectCommand({
      Bucket: req.params.bucketName,
      Key: key
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

// @desc    Generate presigned URL for download
// @route   POST /api/r2/:accountId/buckets/:bucketName/presigned-url
// @access  Private
exports.generatePresignedUrl = async (req, res) => {
  try {
    const { key, expiresIn = 3600 } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Object key is required'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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

    const command = new GetObjectCommand({
      Bucket: req.params.bucketName,
      Key: key
    });

    const url = await getSignedUrl(client, command, { expiresIn: parseInt(expiresIn) });

    res.status(200).json({
      success: true,
      data: { url }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    Get public development URL for object
// @route   GET /api/r2/:accountId/buckets/:bucketName/public-url
// @access  Private
exports.getPublicUrl = async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Object key is required'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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

    // Check if object exists
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: req.params.bucketName,
        Key: key
      });
      await client.send(headCommand);

      // Generate public dev URL
      // Note: This URL only works if Public Access is enabled on the bucket via Cloudflare dashboard
      const publicUrl = `https://${req.params.bucketName}.${credentials.accountId}.r2.dev/${key}`;

      res.status(200).json({
        success: true,
        data: { 
          publicUrl,
          note: 'This URL only works if Public Access is enabled for this bucket in Cloudflare dashboard'
        }
      });
    } catch (error) {
      if (error.name === 'NotFound') {
        return res.status(404).json({
          success: false,
          error: 'Object not found'
        });
      }
      throw error;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// @desc    Simple upload for small files
// @route   POST /api/r2/:accountId/buckets/:bucketName/upload
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    const { key, data, contentType } = req.body;

    if (!key || !data) {
      return res.status(400).json({
        success: false,
        error: 'Key and data are required'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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

    // Convert base64 to buffer
    const buffer = Buffer.from(data, 'base64');

    const command = new PutObjectCommand({
      Bucket: req.params.bucketName,
      Key: key,
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

// @desc    Initiate multipart upload
// @route   POST /api/r2/:accountId/buckets/:bucketName/multipart/initiate
// @access  Private
exports.initiateMultipartUpload = async (req, res) => {
  try {
    const { key, contentType } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key is required'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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
      Bucket: req.params.bucketName,
      Key: key,
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

// @desc    Upload part
// @route   POST /api/r2/:accountId/buckets/:bucketName/multipart/upload-part
// @access  Private
exports.uploadPart = async (req, res) => {
  try {
    const { key, uploadId, partNumber, data } = req.body;

    if (!key || !uploadId || !partNumber || !data) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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

    // Convert base64 to buffer
    const buffer = Buffer.from(data, 'base64');

    const command = new UploadPartCommand({
      Bucket: req.params.bucketName,
      Key: key,
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

// @desc    Complete multipart upload
// @route   POST /api/r2/:accountId/buckets/:bucketName/multipart/complete
// @access  Private
exports.completeMultipartUpload = async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body;

    if (!key || !uploadId || !parts) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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
      Bucket: req.params.bucketName,
      Key: key,
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

// @desc    Abort multipart upload
// @route   POST /api/r2/:accountId/buckets/:bucketName/multipart/abort
// @access  Private
exports.abortMultipartUpload = async (req, res) => {
  try {
    const { key, uploadId } = req.body;

    if (!key || !uploadId) {
      return res.status(400).json({
        success: false,
        error: 'Key and uploadId are required'
      });
    }

    const credentials = await getDecryptedCredentials(req.user.id, req.params.accountId);

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
      Bucket: req.params.bucketName,
      Key: key,
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