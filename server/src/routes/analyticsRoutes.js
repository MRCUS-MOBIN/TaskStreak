const express = require('express');
const router = express.Router();
const {
  getWeeklyAnalytics,
  getCategoryAnalytics,
  getPriorityAnalytics
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/weekly', getWeeklyAnalytics);
router.get('/categories', getCategoryAnalytics);
router.get('/priorities', getPriorityAnalytics);

module.exports = router;
