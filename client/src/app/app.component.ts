import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { TaskStorageService } from './services/task-storage.service';
import { NotificationService, ToastMessage } from './services/notification.service';
import { User } from './models/user.model';

import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PlanTomorrowComponent } from './components/plan-tomorrow/plan-tomorrow.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AuthComponent } from './components/auth/auth.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DashboardComponent,
    PlanTomorrowComponent,
    CalendarComponent,
    AnalyticsComponent,
    ProfileComponent,
    AuthComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  activeView: string = 'dashboard';
  currentUser: User | null = null;
  toasts: ToastMessage[] = [];
  mobileMenuOpen: boolean = false;

  constructor(
    public authService: AuthService,
    public taskStorage: TaskStorageService,
    private notify: NotificationService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.activeView = 'auth';
      } else if (this.activeView === 'auth') {
        this.activeView = 'dashboard';
      }
    });

    this.notify.toasts$.subscribe(t => {
      this.toasts = t;
    });

    this.taskStorage.taskLoadError$.subscribe(message => {
      if (message) this.notify.showToast(message, 'error');
    });
  }

  get userInitial(): string {
    if (!this.currentUser || !this.currentUser.name) return 'U';
    return this.currentUser.name.charAt(0).toUpperCase();
  }

  navigate(view: string) {
    this.activeView = view;
    this.mobileMenuOpen = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  logout() {
    this.authService.logout();
    this.activeView = 'auth';
    this.notify.showToast('Logged out successfully', 'info');
  }

  dismissToast(id: string) {
    this.notify.removeToast(id);
  }
}
