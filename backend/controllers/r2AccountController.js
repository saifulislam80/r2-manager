const R2Account = require('../models/R2Account');
const { encrypt, decrypt } = require('../utils/encryption');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

// @desc    Get all R2 accounts for logged in user
// @route   GET /api/r2accounts
// @access  Private
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await R2Account.find({ user: req.user.id });

    // Return safe data (without decrypted credentials)
    const safeAccounts = accounts.map(account => ({
      id: account._id,
      accountId: account.accountId,
      name: account.name,
      createdAt: account.createdAt
    }));

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: safeAccounts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Add R2 account
// @route   POST /api/r2accounts
// @access  Private
exports.addAccount = async (req, res) => {
  try {
    const { accountId, name, accessKeyId, secretAccessKey } = req.body;

    // Validation
    if (!accountId || !name || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }

    // Test connection before saving
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    try {
      await client.send(new ListBucketsCommand({}));
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid R2 credentials or account ID'
      });
    }

    // Check if account already exists for this user
    const existingAccount = await R2Account.findOne({
      user: req.user.id,
      accountId
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        error: 'This R2 account is already added'
      });
    }

    // Encrypt credentials
    const encryptedAccessKeyId = encrypt(accessKeyId);
    const encryptedSecretAccessKey = encrypt(secretAccessKey);

    // Create account
    const account = await R2Account.create({
      user: req.user.id,
      accountId,
      name,
      accessKeyId: encryptedAccessKeyId,
      secretAccessKey: encryptedSecretAccessKey
    });

    res.status(201).json({
      success: true,
      data: {
        id: account._id,
        accountId: account.accountId,
        name: account.name,
        createdAt: account.createdAt
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

// @desc    Delete R2 account
// @route   DELETE /api/r2accounts/:id
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const account = await R2Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Make sure user owns account
    if (account.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this account'
      });
    }

    await account.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Helper function to get decrypted credentials (used by other controllers)
exports.getDecryptedCredentials = async (userId, accountId) => {
  const account = await R2Account.findOne({
    user: userId,
    _id: accountId
  });

  if (!account) {
    return null;
  }

  return {
    accountId: account.accountId,
    accessKeyId: decrypt(account.accessKeyId),
    secretAccessKey: decrypt(account.secretAccessKey)
  };
};