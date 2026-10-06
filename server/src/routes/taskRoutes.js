const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTodayTasks,
  getTomorrowTasks,
  getLockedPlans,
  lockPlan,
  createTask,
  updateTask,
  toggleTaskComplete,
  deleteTask
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getTasks);
router.get('/today', getTodayTasks);
router.get('/tomorrow', getTomorrowTasks);
router.get('/locked-plans', getLockedPlans);
router.post('/locked-plans', lockPlan);

router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/complete', toggleTaskComplete);
router.delete('/:id', deleteTask);

module.exports = router;
