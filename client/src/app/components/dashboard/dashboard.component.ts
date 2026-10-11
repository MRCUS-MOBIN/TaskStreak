import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStorageService } from '../../services/task-storage.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Task, TaskPriority, TaskCategory } from '../../models/task.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  @Output() navigateTo = new EventEmitter<string>();

  currentUser: User | null = null;
  todayStr: string = '';
  tasks: Task[] = [];
  filteredTasks: Task[] = [];

  // Filters
  selectedPriority: string = 'ALL';
  selectedCategory: string = 'ALL';
  selectedStatus: string = 'ALL';
  searchQuery: string = '';

  // Quick Task Form
  showAddModal: boolean = false;
  editingTask: Task | null = null;

  newTaskTitle: string = '';
  newTaskDescription: string = '';
  newTaskPriority: TaskPriority = 'HIGH';
  newTaskCategory: TaskCategory = 'Coding';
  newTaskRequired: boolean = true;
  newTaskMinutes: number = 30;

  // Categories list
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
    public taskStorage: TaskStorageService,
    public authService: AuthService,
    private notify: NotificationService
  ) {}

  ngOnInit() {
    this.todayStr = this.taskStorage.getTodayStr();
    this.authService.currentUser$.subscribe(u => (this.currentUser = u));

    this.taskStorage.tasks$.subscribe(() => {
      this.loadTasks();
    });
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  get todayFormatted(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    return new Date().toLocaleDateString('en-US', options);
  }

  get totalTasksCount(): number {
    return this.tasks.length;
  }

  get completedTasksCount(): number {
    return this.tasks.filter(t => t.status === 'COMPLETED').length;
  }

  get pendingTasksCount(): number {
    return this.tasks.filter(t => t.status === 'PENDING').length;
  }

  get requiredTasks(): Task[] {
    return this.tasks.filter(t => t.requiredForStreak);
  }

  get completedRequiredCount(): number {
    return this.requiredTasks.filter(t => t.status === 'COMPLETED').length;
  }

  get totalRequiredCount(): number {
    return this.requiredTasks.length;
  }

  get isStreakEarned(): boolean {
    if (this.totalRequiredCount === 0) return this.completedTasksCount > 0;
    return this.completedRequiredCount === this.totalRequiredCount;
  }

  get completionPercentage(): number {
    if (this.totalTasksCount === 0) return 0;
    return Math.round((this.completedTasksCount / this.totalTasksCount) * 100);
  }

  get isTomorrowPlanned(): boolean {
    const tomorrowStr = this.taskStorage.getTomorrowStr();
    const tomorrowTasks = this.taskStorage.getTasks(tomorrowStr);
    return tomorrowTasks.length > 0;
  }

  loadTasks() {
    this.tasks = this.taskStorage.getTasks(this.todayStr);
    this.applyFilters();
  }

  applyFilters() {
    this.filteredTasks = this.tasks.filter(t => {
      if (this.selectedPriority !== 'ALL' && t.priority !== this.selectedPriority) return false;
      if (this.selectedCategory !== 'ALL' && t.category !== this.selectedCategory) return false;
      if (this.selectedStatus !== 'ALL' && t.status !== this.selectedStatus) return false;
      if (
        this.searchQuery.trim() &&
        !t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
        !(t.description || '').toLowerCase().includes(this.searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }

  get highPriorityTasks(): Task[] {
    return this.filteredTasks.filter(t => t.priority === 'HIGH');
  }

  get mediumPriorityTasks(): Task[] {
    return this.filteredTasks.filter(t => t.priority === 'MEDIUM');
  }

  get lowPriorityTasks(): Task[] {
    return this.filteredTasks.filter(t => t.priority === 'LOW');
  }

  async toggleComplete(task: Task) {
    try {
      const updated = await this.taskStorage.toggleTaskComplete(task.id);
      if (updated) {
        if (updated.status === 'COMPLETED') {
          const completedCount = this.completedTasksCount;
          this.notify.showToast(`🎉 ${completedCount} Task${completedCount !== 1 ? 's' : ''} Completed!`, 'success');
          if (this.isStreakEarned) {
            this.notify.showToast('🔥 All required tasks complete! Streak incremented!', 'success');
          }
        } else {
          this.notify.showToast(`Marked as pending: ${updated.title}`, 'info');
        }
      }
    } catch {
      this.notify.showToast('Could not update task. Check the API connection.', 'error');
    }
  }

  async deleteTask(task: Task) {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
      if (await this.taskStorage.deleteTask(task.id)) {
        this.notify.showToast('Task deleted', 'info');
      } else {
        this.notify.showToast('This task belongs to a locked plan', 'warning');
      }
      } catch {
        this.notify.showToast('Could not delete task. Check the API connection.', 'error');
      }
    }
  }

  canManageTask(task: Task): boolean {
    return !this.taskStorage.isPlanLocked(task.date);
  }

  openAddModal() {
    this.editingTask = null;
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskPriority = 'HIGH';
    this.newTaskCategory = 'Coding';
    this.newTaskRequired = true;
    this.newTaskMinutes = 30;
    this.showAddModal = true;
  }

  openEditModal(task: Task) {
    this.editingTask = task;
    this.newTaskTitle = task.title;
    this.newTaskDescription = task.description || '';
    this.newTaskPriority = task.priority;
    this.newTaskCategory = task.category;
    this.newTaskRequired = task.requiredForStreak;
    this.newTaskMinutes = task.estimatedMinutes || 30;
    this.showAddModal = true;
  }

  async saveTask() {
    if (!this.newTaskTitle.trim()) {
      this.notify.showToast('Please enter a task title', 'warning');
      return;
    }

    try {
    if (this.editingTask) {
      const updated = await this.taskStorage.updateTask(this.editingTask.id, {
        title: this.newTaskTitle,
        description: this.newTaskDescription,
        priority: this.newTaskPriority,
        category: this.newTaskCategory,
        requiredForStreak: this.newTaskRequired,
        estimatedMinutes: this.newTaskMinutes
      });
      if (!updated) {
        this.notify.showToast('This task belongs to a locked plan', 'warning');
        return;
      }
      this.notify.showToast('Task updated successfully!', 'success');
    } else {
      const created = await this.taskStorage.createTask({
        title: this.newTaskTitle,
        description: this.newTaskDescription,
        date: this.todayStr,
        priority: this.newTaskPriority,
        category: this.newTaskCategory,
        requiredForStreak: this.newTaskRequired,
        estimatedMinutes: this.newTaskMinutes
      });
      if (!created) {
        this.notify.showToast('Today\'s plan is locked and cannot be changed', 'warning');
        return;
      }
      this.notify.showToast('Task added to Today!', 'success');
    }

    this.showAddModal = false;
    } catch {
      this.notify.showToast('Could not save task. Check the API connection.', 'error');
    }
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
