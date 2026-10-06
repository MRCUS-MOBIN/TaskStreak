export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}
