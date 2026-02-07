const mongoose = require('mongoose');

const uploadLinkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  account: {
    type: mongoose.Schema.ObjectId,
    ref: 'R2Account',
    required: true
  },
  bucketName: {
    type: String,
    required: true,
    trim: true
  },
  prefix: {
    type: String,
    default: '',
    trim: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UploadLink', uploadLinkSchema);
