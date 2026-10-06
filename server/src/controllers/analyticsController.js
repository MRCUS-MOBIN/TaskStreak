const Task = require('../models/Task');

const formatDate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

exports.getWeeklyAnalytics = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const today = new Date();
    const first = today.getDate() - ((today.getDay() + 6) % 7);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyData = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(today.getFullYear(), today.getMonth(), first + i);
      const dateStr = formatDate(dayDate);
      const dayTasks = tasks.filter(t => t.date === dateStr);
      const dayDone = dayTasks.filter(t => t.status === 'COMPLETED').length;
      const rate = dayTasks.length > 0 ? Math.round((dayDone / dayTasks.length) * 100) : 0;

      weeklyData.push({
        dayName: dayNames[i],
        date: dateStr,
        total: dayTasks.length,
        completed: dayDone,
        rate
      });
    }

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate,
      weeklyData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCategoryAnalytics = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id });
    const categoryCounts = {};
    tasks.forEach(t => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });
    res.json(categoryCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPriorityAnalytics = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id });
    const priorityCounts = {
      HIGH: tasks.filter(t => t.priority === 'HIGH').length,
      MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
      LOW: tasks.filter(t => t.priority === 'LOW').length
    };
    res.json(priorityCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
