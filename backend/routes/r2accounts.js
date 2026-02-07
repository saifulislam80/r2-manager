const express = require('express');
const {
  getAccounts,
  addAccount,
  deleteAccount
} = require('../controllers/r2AccountController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getAccounts)
  .post(addAccount);

router.route('/:id')
  .delete(deleteAccount);

module.exports = router;