import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { TaskStorageService } from '../../services/task-storage.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  user: User | null = null;

  name: string = '';
  email: string = '';

  oldPass: string = '';
  newPass: string = '';
  confirmPass: string = '';

  browserNotificationsEnabled: boolean = false;

  constructor(
    public authService: AuthService,
    public taskStorage: TaskStorageService,
    private notify: NotificationService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => {
      this.user = u;
      if (u) {
        this.name = u.name;
        this.email = u.email;
      }
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      this.browserNotificationsEnabled = true;
    }
  }

  get userInitials(): string {
    if (!this.user || !this.user.name) return 'U';
    const parts = this.user.name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return this.user.name.substring(0, 2).toUpperCase();
  }

  get nightPlannerUnlocked(): boolean {
    return this.taskStorage.currentTasks.some(task => task.date > task.createdAt.slice(0, 10));
  }

  get highAchieverUnlocked(): boolean {
    const tasks = this.taskStorage.currentTasks;
    return tasks.length > 0 && tasks.filter(task => task.status === 'COMPLETED').length / tasks.length >= 0.8;
  }

  async saveProfile() {
    const res = await this.authService.updateProfile(this.name, this.email);
    if (res.success) {
      this.notify.showToast(res.message, 'success');
    } else {
      this.notify.showToast(res.message, 'error');
    }
  }

  async changePassword() {
    if (!this.oldPass) {
      this.notify.showToast('Enter your current password first', 'warning');
      return;
    }
    if (!this.newPass || !this.confirmPass) {
      this.notify.showToast('Please enter your new password', 'warning');
      return;
    }
    if (this.newPass !== this.confirmPass) {
      this.notify.showToast('Passwords do not match', 'error');
      return;
    }

    const res = await this.authService.updateProfile(this.name, this.email, this.oldPass, this.newPass);
    this.notify.showToast(res.message, res.success ? 'success' : 'error');
    if (!res.success) return;

    this.oldPass = '';
    this.oldPass = '';
    this.newPass = '';
    this.confirmPass = '';
  }

  async toggleNotifications() {
    const granted = await this.notify.requestBrowserNotificationPermission();
    this.browserNotificationsEnabled = granted;
  }

  refreshTasks() {
    void this.taskStorage.refreshTasks();
    this.notify.showToast('Tasks refreshed from the server', 'info');
  }

  logout() {
    if (confirm('Log out of TaskStreak?')) {
      this.authService.logout();
      this.notify.showToast('Logged out successfully', 'info');
    }
  }
}
