import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './services/api.config';

export interface ApiTask {
  _id?: string;
  userId?: string;
  title: string;
  description?: string;
  date: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  requiredForStreak: boolean;
  estimatedMinutes?: number;
  reminderTime?: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: string | null;
  createdAt?: string;
}

export interface WeeklyAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  weeklyData: { dayName: string; date: string; total: number; completed: number; rate: number }[];
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private api = API_BASE_URL;

  constructor(private http: HttpClient) {}

  getTasks(date?: string): Observable<ApiTask[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<ApiTask[]>(`${this.api}/tasks`, { params });
  }

  getLockedPlans(): Observable<{ lockedPlanDates: string[] }> {
    return this.http.get<{ lockedPlanDates: string[] }>(`${this.api}/tasks/locked-plans`);
  }

  lockPlan(date: string): Observable<{ date: string; locked: boolean }> {
    return this.http.post<{ date: string; locked: boolean }>(`${this.api}/tasks/locked-plans`, { date });
  }

  createTask(task: Partial<ApiTask>): Observable<ApiTask> {
    return this.http.post<ApiTask>(`${this.api}/tasks`, task);
  }

  updateTask(id: string, updates: Partial<ApiTask>): Observable<ApiTask> {
    return this.http.put<ApiTask>(`${this.api}/tasks/${id}`, updates);
  }

  completeTask(id: string): Observable<ApiTask> {
    return this.http.patch<ApiTask>(`${this.api}/tasks/${id}/complete`, {});
  }

  deleteTask(id: string) {
    return this.http.delete(`${this.api}/tasks/${id}`);
  }

  getStreak(): Observable<{currentStreak: number; longestStreak: number}> {
    return this.http.get<{currentStreak: number; longestStreak: number}>(`${this.api}/streak`);
  }

  getWeeklyAnalytics(): Observable<WeeklyAnalytics> {
    return this.http.get<WeeklyAnalytics>(`${this.api}/analytics/weekly`);
  }

  getCategoryAnalytics(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.api}/analytics/categories`);
  }

  getPriorityAnalytics(): Observable<{ HIGH: number; MEDIUM: number; LOW: number }> {
    return this.http.get<{ HIGH: number; MEDIUM: number; LOW: number }>(`${this.api}/analytics/priorities`);
  }
}
