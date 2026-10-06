const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string'
      || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email) || name.trim().length > 80 || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Enter a valid email, a name up to 80 characters, and a password of at least 8 characters' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Profile update must be a JSON object' });
    }
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email !== undefined && (typeof email !== 'string' || !email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (email && email.toLowerCase() !== user.email) {
      if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
      const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (emailExists) return res.status(409).json({ message: 'Email is already in use' });
      user.email = email.toLowerCase().trim();
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ message: 'Enter a valid name' });
    }
    if (name) {
      if (name.trim().length > 80) return res.status(400).json({ message: 'Name must be 80 characters or fewer' });
      user.name = name.trim();
    }

    if (newPassword !== undefined && typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'New password must be text' });
    }
    if (newPassword) {
      if (typeof currentPassword !== 'string' || !currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      if (newPassword.length < 8 || newPassword.length > 128) {
        return res.status(400).json({ message: 'New password must be between 8 and 128 characters' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      createdAt: user.createdAt,
      token: generateToken(user._id)
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email is already in use' });
    res.status(500).json({ message: 'Could not update account details' });
  }
};
