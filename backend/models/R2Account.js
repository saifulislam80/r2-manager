const mongoose = require('mongoose');

const r2AccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  accountId: {
    type: String,
    required: [true, 'Please provide Cloudflare Account ID'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please provide account name'],
    trim: true
  },
  accessKeyId: {
    type: String,
    required: [true, 'Please provide Access Key ID']
  },
  secretAccessKey: {
    type: String,
    required: [true, 'Please provide Secret Access Key']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for user and accountId
r2AccountSchema.index({ user: 1, accountId: 1 }, { unique: true });

module.exports = mongoose.model('R2Account', r2AccountSchema);