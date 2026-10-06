import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStorageService } from '../../services/task-storage.service';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../task.service';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  analyticsData: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
    weeklyData: { dayName: string; date: string; total: number; completed: number; rate: number }[];
    categoryCounts: Record<string, number>;
    priorityCounts: { HIGH: number; MEDIUM: number; LOW: number };
  } | null = null;
  loadError = '';
  private tasksSubscription?: Subscription;

  constructor(
    public taskStorage: TaskStorageService,
    public authService: AuthService,
    private taskApi: TaskService
  ) {}

  ngOnInit() {
    this.tasksSubscription = this.taskStorage.tasks$.subscribe(() => this.loadAnalytics());
  }

  ngOnDestroy() {
    this.tasksSubscription?.unsubscribe();
  }

  loadAnalytics() {
    forkJoin({
      weekly: this.taskApi.getWeeklyAnalytics(),
      categories: this.taskApi.getCategoryAnalytics(),
      priorities: this.taskApi.getPriorityAnalytics()
    }).subscribe({
      next: ({ weekly, categories, priorities }) => {
        this.analyticsData = {
          ...weekly,
          categoryCounts: categories,
          priorityCounts: priorities
        };
        this.loadError = '';
      },
      error: () => {
        this.analyticsData = null;
        this.loadError = 'Analytics are unavailable. Check the API connection and try again.';
      }
    });
  }

  get categoryList(): { name: string; count: number; percentage: number }[] {
    if (!this.analyticsData || !this.analyticsData.categoryCounts) return [];

    const total = this.analyticsData.totalTasks || 1;
    return Object.entries(this.analyticsData.categoryCounts).map(([name, count]) => {
      const cnt = count as number;
      return {
        name,
        count: cnt,
        percentage: Math.round((cnt / total) * 100)
      };
    }).sort((a, b) => b.count - a.count);
  }

  get weeklyItems(): { dayName: string; date: string; total: number; completed: number; rate: number }[] {
    return this.analyticsData?.weeklyData || [];
  }

  getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'Coding': return '💻';
      case 'College': return '📚';
      case 'Project': return '🚀';
      case 'Placement': return '💼';
      case 'Fitness': return '🏃';
      case 'Personal': return '🏠';
      case 'Learning': return '📖';
      default: return '📌';
    }
  }
}
