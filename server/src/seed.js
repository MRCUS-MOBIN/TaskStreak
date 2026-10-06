require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Task = require('./models/Task');

const seedData = async () => {
  try {
    await connectDB();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const demoUser = await User.findOneAndUpdate(
      { email: 'mobin@taskstreak.app' },
      { $set: {
        name: 'Mobin',
        email: 'mobin@taskstreak.app',
        password: hashedPassword,
        currentStreak: 7,
        longestStreak: 14,
        lockedPlanDates: []
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log(`Demo User Created: ${demoUser.email}`);

    const formatDate = (dateObj) => {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const now = new Date();
    const tasks = [];

    const getOffsetDateStr = (offset) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      return formatDate(d);
    };

    // Past 6 days
    for (let dayOffset = -6; dayOffset <= -1; dayOffset++) {
      const dateStr = getOffsetDateStr(dayOffset);
      tasks.push(
        {
          userId: demoUser._id,
          title: 'Solve 2 Java String Problems',
          description: `Leetcode practice for ${dateStr}`,
          date: dateStr,
          priority: 'HIGH',
          category: 'Placement',
          requiredForStreak: true,
          estimatedMinutes: 45,
          status: 'COMPLETED',
          completedAt: new Date(dateStr + 'T18:00:00Z')
        },
        {
          userId: demoUser._id,
          title: 'DBMS Revision Notes',
          description: 'SQL queries and Indexing',
          date: dateStr,
          priority: 'HIGH',
          category: 'College',
          requiredForStreak: true,
          estimatedMinutes: 60,
          status: 'COMPLETED',
          completedAt: new Date(dateStr + 'T19:00:00Z')
        }
      );
    }

    // Today
    const todayStr = getOffsetDateStr(0);
    tasks.push(
      {
        userId: demoUser._id,
        title: 'Solve 2 Java Problems',
        description: 'Practice LeetCode mediums for placement prep',
        date: todayStr,
        priority: 'HIGH',
        category: 'Placement',
        requiredForStreak: true,
        estimatedMinutes: 45,
        status: 'COMPLETED',
        completedAt: new Date()
      },
      {
        userId: demoUser._id,
        title: 'Complete DBMS Revision',
        description: 'B-Trees and Hash Indexing concepts',
        date: todayStr,
        priority: 'HIGH',
        category: 'College',
        requiredForStreak: true,
        estimatedMinutes: 60,
        status: 'COMPLETED',
        completedAt: new Date()
      },
      {
        userId: demoUser._id,
        title: 'Work on MEAN Stack UI Components',
        description: 'Design dynamic progress cards and navbar',
        date: todayStr,
        priority: 'MEDIUM',
        category: 'Project',
        requiredForStreak: true,
        estimatedMinutes: 90,
        status: 'PENDING'
      }
    );

    // Tomorrow
    const tomorrowStr = getOffsetDateStr(1);
    tasks.push(
      {
        userId: demoUser._id,
        title: 'Implement Angular RxJS State',
        description: 'Connect task storage service with component subjects',
        date: tomorrowStr,
        priority: 'HIGH',
        category: 'Project',
        requiredForStreak: true,
        estimatedMinutes: 60,
        status: 'PENDING'
      },
      {
        userId: demoUser._id,
        title: 'System Design Mock Interview',
        date: tomorrowStr,
        priority: 'HIGH',
        category: 'Placement',
        requiredForStreak: true,
        estimatedMinutes: 45,
        status: 'PENDING'
      }
    );

    await Task.deleteMany({ userId: demoUser._id });
    await Task.insertMany(tasks);
    console.log(`Created ${tasks.length} sample tasks! Database seeding complete.`);
    process.exit(0);
  } catch (error) {
    console.error('Seed script error:', error);
    process.exit(1);
  }
};

seedData();
