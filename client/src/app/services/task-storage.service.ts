import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Task, TaskPriority, TaskCategory, DayProgress } from '../models/task.model';
import { AuthService } from './auth.service';
import { TaskService, ApiTask } from '../task.service';

@Injectable({
  providedIn: 'root'
})
export class TaskStorageService {
  private lockedPlanDates = new Set<string>();
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private taskLoadErrorSubject = new BehaviorSubject<string>('');
  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();
  public taskLoadError$: Observable<string> = this.taskLoadErrorSubject.asObservable();

  constructor(private authService: AuthService, private taskApi: TaskService) {
    this.authService.currentUser$.subscribe(user => {
      if (user) void this.refreshTasks();
      else {
        this.tasksSubject.next([]);
        this.lockedPlanDates.clear();
        this.taskLoadErrorSubject.next('');
      }
    });
  }

  private mapApiTask(t: ApiTask): Task {
    return {
      id: t._id || '',
      userId: typeof t.userId === 'string' ? t.userId : this.authService.currentUserValue?.id || '',
      title: t.title || 'Untitled Task',
      description: t.description || '',
      date: t.date || this.getTodayStr(),
      priority: (['HIGH', 'MEDIUM', 'LOW'].includes(t.priority) ? t.priority : 'MEDIUM') as TaskPriority,
      category: (t.category || 'Coding') as TaskCategory,
      requiredForStreak: t.requiredForStreak !== undefined ? Boolean(t.requiredForStreak) : true,
      estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : 30,
      reminderTime: t.reminderTime || '',
      status: t.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString()
    };
  }

  public async refreshTasks() {
    try {
      const [apiTasks, lockedPlans] = await Promise.all([
        firstValueFrom(this.taskApi.getTasks()),
        firstValueFrom(this.taskApi.getLockedPlans())
      ]);
      const tasks = apiTasks.map(task => this.mapApiTask(task));
      this.lockedPlanDates = new Set(lockedPlans.lockedPlanDates || []);
      this.tasksSubject.next(tasks);
      this.taskLoadErrorSubject.next('');
      await this.refreshStreakFromApi();
    } catch (error) {
      console.error('Unable to load tasks from the API', error);
      this.tasksSubject.next([]);
      this.taskLoadErrorSubject.next('Tasks could not be loaded from the API. Check the backend connection and retry.');
    }
  }

  private async refreshStreakFromApi() {
    try {
      const streak = await firstValueFrom(this.taskApi.getStreak());
      this.authService.updateStreakStats(streak.currentStreak, streak.longestStreak);
    } catch (error) {
      console.error('Unable to refresh streak from the API', error);
    }
  }

  public get currentTasks(): Task[] {
    return this.tasksSubject.value || [];
  }

  // Format date to YYYY-MM-DD
  public formatDate(dateObj: Date): string {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  public getTodayStr(): string {
    return this.formatDate(new Date());
  }

  public getTomorrowStr(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return this.formatDate(d);
  }

  public isPlanLocked(date: string): boolean {
    return this.lockedPlanDates.has(date);
  }

  public async lockPlan(date: string): Promise<boolean> {
    if (this.isPlanLocked(date)) return false;
    try {
      await firstValueFrom(this.taskApi.lockPlan(date));
      this.lockedPlanDates.add(date);
      return true;
    } catch {
      return false;
    }
  }

  public getTasks(date?: string): Task[] {
    const userId = this.authService.currentUserValue?.id || 'user_mobin_01';
    let tasks = (this.currentTasks || []).filter(t => t && (t.userId === userId || !t.userId));
    if (date) {
      tasks = tasks.filter(t => t.date === date);
    }

    const priorityWeight: Record<string, number> = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    return tasks.sort((a, b) => {
      const wA = priorityWeight[a.priority] || 1;
      const wB = priorityWeight[b.priority] || 1;
      const weightDiff = wB - wA;
      if (weightDiff !== 0) return weightDiff;
      return (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
    });
  }

  public async createTask(data: {
    title: string;
    description?: string;
    date: string;
    priority: TaskPriority;
    category: TaskCategory;
    requiredForStreak: boolean;
    estimatedMinutes?: number;
    reminderTime?: string;
  }): Promise<Task | null> {
    const date = data.date || this.getTodayStr();
    if (this.isPlanLocked(date)) return null;

    const created = await firstValueFrom(this.taskApi.createTask({
      title: data.title.trim(),
      description: data.description || '',
      date,
      priority: data.priority,
      category: data.category,
      requiredForStreak: data.requiredForStreak,
      estimatedMinutes: data.estimatedMinutes,
      reminderTime: data.reminderTime
    }));
    const task = this.mapApiTask(created);
    this.tasksSubject.next([task, ...this.currentTasks]);
    await this.refreshStreakFromApi();
    return task;
  }

  public async toggleTaskComplete(taskId: string): Promise<Task | null> {
    const existing = this.currentTasks.find(t => t && t.id === taskId);
    if (!existing) return null;

    const newStatus = existing.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const optimisticTask: Task = {
      ...existing,
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined
    };

    // Immediately update local UI state (Optimistic)
    this.replaceCachedTask(optimisticTask);
    this.recalculateStreak(this.currentTasks);

    try {
      const updated = await firstValueFrom(this.taskApi.completeTask(taskId));
      const serverTask = this.mapApiTask(updated);
      this.replaceCachedTask(serverTask);
      await this.refreshStreakFromApi();
      return serverTask;
    } catch (error) {
      console.warn('API sync failed, preserving optimistic complete state:', error);
      return optimisticTask;
    }
  }

  public async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const tasks = [...this.currentTasks];
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;
    if (this.isPlanLocked(tasks[index].date) || (updates.date && this.isPlanLocked(updates.date))) return null;

    const updated = await firstValueFrom(this.taskApi.updateTask(taskId, updates));
    const task = this.mapApiTask(updated);
    this.replaceCachedTask(task);
    await this.refreshStreakFromApi();
    return task;
  }

  public async deleteTask(taskId: string): Promise<boolean> {
    const task = this.currentTasks.find(t => t.id === taskId);
    if (!task || this.isPlanLocked(task.date)) return false;

    await firstValueFrom(this.taskApi.deleteTask(taskId));
    this.tasksSubject.next(this.currentTasks.filter(t => t.id !== taskId));
    await this.refreshStreakFromApi();
    return true;
  }

  private replaceCachedTask(task: Task) {
    this.tasksSubject.next(this.currentTasks.map(current => current.id === task.id ? task : current));
  }

  public getDayProgress(date: string): DayProgress {
    const tasksForDay = this.getTasks(date);
    const totalTasks = tasksForDay.length;
    const completedTasks = tasksForDay.filter(t => t.status === 'COMPLETED').length;
    const requiredTasks = tasksForDay.filter(t => t.requiredForStreak).length;
    const completedRequiredTasks = tasksForDay.filter(t => t.requiredForStreak && t.status === 'COMPLETED').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let status: 'FULL' | 'PARTIAL' | 'MISSED' | 'EMPTY' = 'EMPTY';

    if (totalTasks === 0) {
      status = 'EMPTY';
    } else if (requiredTasks > 0 && completedRequiredTasks === requiredTasks) {
      status = 'FULL';
    } else if (completedTasks > 0) {
      status = 'PARTIAL';
    } else {
      const todayStr = this.getTodayStr();
      status = date < todayStr ? 'MISSED' : 'PARTIAL';
    }

    return {
      date,
      totalTasks,
      completedTasks,
      requiredTasks,
      completedRequiredTasks,
      completionRate,
      status
    };
  }

  public recalculateStreak(tasksList: Task[]) {
    const userId = this.authService.currentUserValue?.id || 'user_mobin_01';
    const userTasks = (tasksList || []).filter(t => t && (t.userId === userId || !t.userId));

    if (userTasks.length === 0) {
      this.authService.updateStreakStats(0, 0);
      return;
    }

    const todayStr = this.getTodayStr();

    const tasksByDate = new Map<string, Task[]>();
    userTasks.forEach(t => {
      const list = tasksByDate.get(t.date) || [];
      list.push(t);
      tasksByDate.set(t.date, list);
    });

    const isDayQualifying = (dateStr: string): boolean => {
      const tasksOnDate = tasksByDate.get(dateStr) || [];
      const required = tasksOnDate.filter(t => t.requiredForStreak);
      if (required.length === 0) {
        return tasksOnDate.length > 0 && tasksOnDate.every(t => t.status === 'COMPLETED');
      }
      return required.every(t => t.status === 'COMPLETED');
    };

    let currentStreak = 0;
    let checkDate = new Date();

    const todayQualifies = isDayQualifying(todayStr);

    if (todayQualifies) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      const todayTasks = tasksByDate.get(todayStr) || [];
      const todayHasPendingRequired = todayTasks.some(t => t.requiredForStreak && t.status === 'PENDING');
      if (todayHasPendingRequired) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (todayTasks.length > 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    for (let i = 0; i < 365; i++) {
      const dateStr = this.formatDate(checkDate);
      const hasTasks = tasksByDate.has(dateStr);

      if (hasTasks) {
        if (isDayQualifying(dateStr)) {
          currentStreak++;
        } else {
          break;
        }
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const allDates = Array.from(tasksByDate.keys()).sort();
    let longestStreak = 0;
    let tempStreak = 0;

    allDates.forEach(dateStr => {
      if (isDayQualifying(dateStr)) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    });

    this.authService.updateStreakStats(currentStreak, Math.max(longestStreak, currentStreak));
  }

  public getAnalytics() {
    const userId = this.authService.currentUserValue?.id || 'user_mobin_01';
    const userTasks = (this.currentTasks || []).filter(t => t && (t.userId === userId || !t.userId));

    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const priorityCounts = {
      HIGH: userTasks.filter(t => t.priority === 'HIGH').length,
      MEDIUM: userTasks.filter(t => t.priority === 'MEDIUM').length,
      LOW: userTasks.filter(t => t.priority === 'LOW').length
    };

    const categoryCounts: Record<string, number> = {};
    userTasks.forEach(t => {
      const cat = t.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    let topCategory = 'None';
    let maxCatCount = 0;
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategory = cat;
      }
    });

    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1;
    const weeklyData: { dayName: string; date: string; total: number; completed: number; rate: number }[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(curr.setDate(first + i));
      const dateStr = this.formatDate(dayDate);
      const dayTasks = userTasks.filter(t => t.date === dateStr);
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

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate,
      priorityCounts,
      categoryCounts,
      topCategory,
      weeklyData
    };
  }

  public resetSeedData() {
    void this.refreshTasks();
  }

  private generateSeedData(): Task[] {
    const userId = 'user_mobin_01';
    const now = new Date();
    const tasks: Task[] = [];

    const getOffsetDateStr = (offsetDays: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return this.formatDate(d);
    };

    const pastTasksTemplate = [
      { title: 'Solve 2 Java Problems', priority: 'HIGH' as TaskPriority, category: 'Placement' as TaskCategory, required: true, time: 45 },
      { title: 'DBMS Revision Notes', priority: 'HIGH' as TaskPriority, category: 'College' as TaskCategory, required: true, time: 60 },
      { title: 'Watch Node.js Video Tutorial', priority: 'MEDIUM' as TaskPriority, category: 'Coding' as TaskCategory, required: false, time: 30 },
      { title: '30 Mins Evening Jogging', priority: 'LOW' as TaskPriority, category: 'Fitness' as TaskCategory, required: false, time: 30 }
    ];

    for (let dayOffset = -6; dayOffset <= -1; dayOffset++) {
      const dateStr = getOffsetDateStr(dayOffset);
      pastTasksTemplate.forEach((tmpl, idx) => {
        tasks.push({
          id: `seed_past_${dayOffset}_${idx}`,
          userId,
          title: tmpl.title,
          description: `Daily goal completed on ${dateStr}`,
          date: dateStr,
          priority: tmpl.priority,
          category: tmpl.category,
          requiredForStreak: tmpl.required,
          estimatedMinutes: tmpl.time,
          status: 'COMPLETED',
          completedAt: new Date(dateStr + 'T18:00:00Z').toISOString(),
          createdAt: new Date(dateStr + 'T08:00:00Z').toISOString()
        });
      });
    }

    const todayStr = getOffsetDateStr(0);
    tasks.push(
      {
        id: 'seed_today_1',
        userId,
        title: 'Solve 2 Java String Problems',
        description: 'Practice LeetCode mediums for placement prep',
        date: todayStr,
        priority: 'HIGH',
        category: 'Placement',
        requiredForStreak: true,
        estimatedMinutes: 45,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_today_2',
        userId,
        title: 'Complete DBMS Indexing Revision',
        description: 'B-Trees and Hash Indexing concepts',
        date: todayStr,
        priority: 'HIGH',
        category: 'College',
        requiredForStreak: true,
        estimatedMinutes: 60,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_today_3',
        userId,
        title: 'Work on MEAN Stack UI Components',
        description: 'Design dynamic progress cards and navbar',
        date: todayStr,
        priority: 'MEDIUM',
        category: 'Project',
        requiredForStreak: true,
        estimatedMinutes: 90,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_today_4',
        userId,
        title: 'Read Express.js Routing Docs',
        description: 'Understand router middleware and parameters',
        date: todayStr,
        priority: 'MEDIUM',
        category: 'Coding',
        requiredForStreak: false,
        estimatedMinutes: 25,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_today_5',
        userId,
        title: 'Organize Study Notes',
        description: 'Clean up desktop folder and PDFs',
        date: todayStr,
        priority: 'LOW',
        category: 'Personal',
        requiredForStreak: false,
        estimatedMinutes: 15,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }
    );

    const tomorrowStr = getOffsetDateStr(1);
    tasks.push(
      {
        id: 'seed_tomorrow_1',
        userId,
        title: 'Implement Angular RxJS State',
        description: 'Connect task storage service with component subjects',
        date: tomorrowStr,
        priority: 'HIGH',
        category: 'Project',
        requiredForStreak: true,
        estimatedMinutes: 60,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_tomorrow_2',
        userId,
        title: 'System Design Mock Interview',
        description: 'Practice high-level architecture questions',
        date: tomorrowStr,
        priority: 'HIGH',
        category: 'Placement',
        requiredForStreak: true,
        estimatedMinutes: 45,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_tomorrow_3',
        userId,
        title: 'Full Body Workout Session',
        description: 'Gym evening routine',
        date: tomorrowStr,
        priority: 'MEDIUM',
        category: 'Fitness',
        requiredForStreak: false,
        estimatedMinutes: 50,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }
    );

    return tasks;
  }
}
