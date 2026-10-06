const express = require('express');
const router = express.Router();
const { getStreak } = require('../controllers/streakController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getStreak);

module.exports = router;
