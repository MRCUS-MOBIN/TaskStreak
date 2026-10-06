const Task = require('../models/Task');
const User = require('../models/User');
const { calculateStreaks } = require('../utils/streak');

exports.getStreak = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id }).lean();
    const { currentStreak, longestStreak: calculatedLongest } = calculateStreaks(tasks);
    const longestStreak = Math.max(req.user.longestStreak || 0, calculatedLongest);

    // Sync to User model
    await User.findByIdAndUpdate(req.user._id, { currentStreak, longestStreak });

    res.json({
      currentStreak,
      longestStreak
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
