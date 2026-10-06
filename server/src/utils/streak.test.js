const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateStreaks } = require('./streak');

const task = (date, requiredForStreak = true, status = 'COMPLETED') => ({
  date,
  requiredForStreak,
  status
});

test('counts only calendar-consecutive qualifying days for longest streak', () => {
  const tasks = [
    task('2026-09-28'),
    task('2026-09-29'),
    task('2026-10-01')
  ];

  assert.deepEqual(calculateStreaks(tasks, '2026-10-02'), {
    currentStreak: 1,
    longestStreak: 2
  });
});

test('unfinished optional tasks do not break a qualifying day', () => {
  const tasks = [
    task('2026-10-01'),
    task('2026-10-01', false, 'PENDING'),
    task('2026-10-02'),
    task('2026-10-02', false, 'PENDING')
  ];

  assert.deepEqual(calculateStreaks(tasks, '2026-10-02'), {
    currentStreak: 2,
    longestStreak: 2
  });
});

test('an incomplete required task breaks the previous-day chain', () => {
  const tasks = [
    task('2026-10-01', true, 'PENDING'),
    task('2026-10-02')
  ];

  assert.deepEqual(calculateStreaks(tasks, '2026-10-02'), {
    currentStreak: 1,
    longestStreak: 1
  });
});

test('a day with only optional tasks qualifies only when all are completed', () => {
  const tasks = [
    task('2026-10-01', false, 'PENDING'),
    task('2026-10-02')
  ];

  assert.deepEqual(calculateStreaks(tasks, '2026-10-02'), {
    currentStreak: 1,
    longestStreak: 1
  });
});