const toDate = (dateString) => new Date(`${dateString}T00:00:00.000Z`);

const formatDate = (date) => date.toISOString().slice(0, 10);

const calculateStreaks = (tasks, today = formatDate(new Date())) => {
  const tasksByDate = new Map();
  for (const task of tasks) {
    const dateTasks = tasksByDate.get(task.date) || [];
    dateTasks.push(task);
    tasksByDate.set(task.date, dateTasks);
  }

  const qualifyingDates = new Set();
  for (const [date, dateTasks] of tasksByDate) {
    const requiredTasks = dateTasks.filter(task => task.requiredForStreak);
    const qualifies = requiredTasks.length > 0
      ? requiredTasks.every(task => task.status === 'COMPLETED')
      : dateTasks.every(task => task.status === 'COMPLETED');
    if (qualifies) qualifyingDates.add(date);
  }

  const sortedDates = [...qualifyingDates].sort();
  let longestStreak = 0;
  let runLength = 0;
  let previousDate = null;

  for (const date of sortedDates) {
    const consecutive = previousDate
      && formatDate(new Date(toDate(previousDate).getTime() + 86400000)) === date;
    runLength = consecutive ? runLength + 1 : 1;
    longestStreak = Math.max(longestStreak, runLength);
    previousDate = date;
  }

  let currentStreak = 0;
  let checkDate = qualifyingDates.has(today)
    ? toDate(today)
    : new Date(toDate(today).getTime() - 86400000);

  for (let i = 0; i < 365; i++) {
    const date = formatDate(checkDate);
    if (!qualifyingDates.has(date)) break;
    currentStreak++;
    checkDate = new Date(checkDate.getTime() - 86400000);
  }

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
};

module.exports = { calculateStreaks };