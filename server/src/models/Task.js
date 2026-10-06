const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    date: {
      type: String,
      required: true // YYYY-MM-DD
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM'
    },
    category: {
      type: String,
      enum: [
        'Coding',
        'College',
        'Project',
        'Placement',
        'Fitness',
        'Personal',
        'Learning',
        'Other'
      ],
      default: 'Coding'
    },
    requiredForStreak: {
      type: Boolean,
      default: true
    },
    estimatedMinutes: {
      type: Number,
      default: 30
    },
    reminderTime: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED'],
      default: 'PENDING'
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
