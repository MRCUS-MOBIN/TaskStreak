const Task = require('../models/Task');
const User = require('../models/User');

const isPlanLocked = async (userId, date) => User.exists({ _id: userId, lockedPlanDates: date });
const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const getTodayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

exports.getTasks = async (req, res) => {
  try {
    const { date } = req.query;
    if (date && !isValidDate(date)) {
      return res.status(400).json({ message: 'Date must use YYYY-MM-DD format' });
    }
    const filter = { userId: req.user._id };
    if (date) {
      filter.date = date;
    }
    const tasks = await Task.find(filter).sort({ priority: 1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTodayTasks = async (req, res) => {
  try {
    const todayStr = getTodayStr();
    const tasks = await Task.find({ userId: req.user._id, date: todayStr }).sort({ priority: 1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTomorrowTasks = async (req, res) => {
  try {
    const tomorrowStr = getTomorrowStr();
    const tasks = await Task.find({ userId: req.user._id, date: tomorrowStr }).sort({ priority: 1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLockedPlans = async (req, res) => {
  res.json({ lockedPlanDates: req.user.lockedPlanDates || [] });
};

exports.lockPlan = async (req, res) => {
  try {
    const { date } = req.body || {};
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'A valid plan date is required' });
    }
    const tasksExist = await Task.exists({ userId: req.user._id, date });
    if (!tasksExist) return res.status(400).json({ message: 'Add at least one task before locking this plan' });

    await User.updateOne({ _id: req.user._id }, { $addToSet: { lockedPlanDates: date } });
    res.json({ date, locked: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, date, priority, category, requiredForStreak, estimatedMinutes, reminderTime } = req.body || {};
    if (!title || !date) {
      return res.status(400).json({ message: 'Title and date are required' });
    }
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 160
      || !isValidDate(date)
      || (description !== undefined && typeof description !== 'string')
      || (reminderTime !== undefined && typeof reminderTime !== 'string')
      || (requiredForStreak !== undefined && typeof requiredForStreak !== 'boolean')
      || (priority && !['HIGH', 'MEDIUM', 'LOW'].includes(priority))
      || (category && !['Coding', 'College', 'Project', 'Placement', 'Fitness', 'Personal', 'Learning', 'Other'].includes(category))
      || (estimatedMinutes !== undefined && (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440))) {
      return res.status(400).json({ message: 'Task details are invalid' });
    }
    if (await isPlanLocked(req.user._id, date)) {
      return res.status(409).json({ message: 'This plan is locked' });
    }

    const task = await Task.create({
      userId: req.user._id,
      title,
      description: description || '',
      date,
      priority: priority || 'MEDIUM',
      category: category || 'Coding',
      requiredForStreak: requiredForStreak !== undefined ? requiredForStreak : true,
      estimatedMinutes: estimatedMinutes || 30,
      reminderTime: reminderTime || ''
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ message: 'Task update must be a JSON object' });
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'date') && !isValidDate(updates.date)) {
      return res.status(400).json({ message: 'Date must use a valid YYYY-MM-DD format' });
    }
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (await isPlanLocked(req.user._id, task.date) || (updates.date && await isPlanLocked(req.user._id, updates.date))) {
      return res.status(409).json({ message: 'This plan is locked' });
    }

    const allowedFields = ['title', 'description', 'date', 'priority', 'category', 'requiredForStreak', 'estimatedMinutes', 'reminderTime'];
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) task[field] = updates[field];
    }
    if (typeof task.title !== 'string' || !task.title.trim() || task.title.length > 160 || !isValidDate(task.date)
      || (task.description !== undefined && typeof task.description !== 'string')
      || (task.reminderTime !== undefined && typeof task.reminderTime !== 'string')) {
      return res.status(400).json({ message: 'Task details are invalid' });
    }
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(task.priority)
      || !['Coding', 'College', 'Project', 'Placement', 'Fitness', 'Personal', 'Learning', 'Other'].includes(task.category)
      || typeof task.requiredForStreak !== 'boolean'
      || !Number.isInteger(task.estimatedMinutes) || task.estimatedMinutes < 1 || task.estimatedMinutes > 1440) {
      return res.status(400).json({ message: 'Task details are invalid' });
    }
    const updated = await task.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleTaskComplete = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = task.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
    task.completedAt = task.status === 'COMPLETED' ? new Date() : null;

    const updated = await task.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (await isPlanLocked(req.user._id, task.date)) {
      return res.status(409).json({ message: 'This plan is locked' });
    }

    const result = await Task.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
