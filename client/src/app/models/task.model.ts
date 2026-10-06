export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskCategory =
  | 'Coding'
  | 'College'
  | 'Project'
  | 'Placement'
  | 'Fitness'
  | 'Personal'
  | 'Learning'
  | 'Other';

export type TaskStatus = 'PENDING' | 'COMPLETED';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  priority: TaskPriority;
  category: TaskCategory;
  requiredForStreak: boolean;
  estimatedMinutes?: number;
  reminderTime?: string;
  status: TaskStatus;
  completedAt?: string;
  createdAt: string;
}

export interface DayProgress {
  date: string;
  totalTasks: number;
  completedTasks: number;
  requiredTasks: number;
  completedRequiredTasks: number;
  completionRate: number;
  status: 'FULL' | 'PARTIAL' | 'MISSED' | 'EMPTY';
}
