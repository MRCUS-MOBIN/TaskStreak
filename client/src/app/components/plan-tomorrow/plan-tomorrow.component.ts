import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStorageService } from '../../services/task-storage.service';
import { NotificationService } from '../../services/notification.service';
import { Task, TaskPriority, TaskCategory } from '../../models/task.model';

@Component({
  selector: 'app-plan-tomorrow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-tomorrow.component.html'
})
export class PlanTomorrowComponent implements OnInit {
  tomorrowStr: string = '';
  tomorrowTasks: Task[] = [];
  planLocked = false;

  // Form fields
  title: string = '';
  description: string = '';
  priority: TaskPriority = 'HIGH';
  category: TaskCategory = 'Placement';
  requiredForStreak: boolean = true;
  estimatedMinutes: number = 45;

  categories: TaskCategory[] = [
    'Coding',
    'College',
    'Project',
    'Placement',
    'Fitness',
    'Personal',
    'Learning',
    'Other'
  ];

  constructor(
    private taskStorage: TaskStorageService,
    private notify: NotificationService
  ) {}

  ngOnInit() {
    this.tomorrowStr = this.taskStorage.getTomorrowStr();
    this.loadTomorrowTasks();
    this.taskStorage.tasks$.subscribe(() => {
      this.loadTomorrowTasks();
    });
  }

  get tomorrowFormatted(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    return d.toLocaleDateString('en-US', options);
  }

  loadTomorrowTasks() {
    this.tomorrowTasks = this.taskStorage.getTasks(this.tomorrowStr);
    this.planLocked = this.taskStorage.isPlanLocked(this.tomorrowStr);
  }

  async addTask() {
    if (this.planLocked) return;

    if (!this.title.trim()) {
      this.notify.showToast('Task title is required', 'warning');
      return;
    }

    let task: Task | null;
    try {
      task = await this.taskStorage.createTask({
      title: this.title,
      description: this.description,
      date: this.tomorrowStr,
      priority: this.priority,
      category: this.category,
      requiredForStreak: this.requiredForStreak,
      estimatedMinutes: this.estimatedMinutes
      });
    } catch {
      this.notify.showToast('Could not save task. Check the API connection.', 'error');
      return;
    }
    if (!task) {
      this.notify.showToast('This plan is locked and cannot be changed', 'warning');
      this.loadTomorrowTasks();
      return;
    }

    this.notify.showToast(`Task added to Tomorrow's Plan!`, 'success');

    // Reset title & desc, keep category/priority
    this.title = '';
    this.description = '';
  }

  async deleteTask(task: Task) {
    try {
      if (await this.taskStorage.deleteTask(task.id)) {
        this.notify.showToast('Task removed from plan', 'info');
      }
    } catch {
      this.notify.showToast('Could not delete task. Check the API connection.', 'error');
    }
  }

  async savePlan() {
    if (this.tomorrowTasks.length === 0) {
      this.notify.showToast('Please add at least one task before locking tomorrow\'s plan', 'warning');
      return;
    }
    try {
      if (!await this.taskStorage.lockPlan(this.tomorrowStr)) {
        this.notify.showToast('Tomorrow\'s plan is already locked or could not be saved', 'warning');
        this.loadTomorrowTasks();
        return;
      }
    } catch {
      this.notify.showToast('Could not lock plan. Check the API connection.', 'error');
      return;
    }
    this.loadTomorrowTasks();
    this.notify.showToast('🌙 Tomorrow Plan Locked! At midnight, these will become Today\'s Tasks.', 'success');
  }

  get highPriorityTasks(): Task[] {
    return this.tomorrowTasks.filter(t => t.priority === 'HIGH');
  }

  get mediumPriorityTasks(): Task[] {
    return this.tomorrowTasks.filter(t => t.priority === 'MEDIUM');
  }

  get lowPriorityTasks(): Task[] {
    return this.tomorrowTasks.filter(t => t.priority === 'LOW');
  }

  getCategoryIcon(cat: string): string {
    if (!cat) return '📌';
    const normalized = cat.trim().toLowerCase();
    switch (normalized) {
      case 'coding': return '💻';
      case 'college': return '📚';
      case 'project': return '🚀';
      case 'placement': return '💼';
      case 'fitness': return '🏃';
      case 'personal': return '🏠';
      case 'learning': return '📖';
      case 'other': return '📁';
      default: return '📌';
    }
  }
}
