import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html'
})
export class AuthComponent {
  @Output() loggedIn = new EventEmitter<void>();

  isRegister: boolean = false;

  // Login fields
  loginEmail: string = 'mobin@taskstreak.app';
  loginPass: string = 'password123';

  // Register fields
  regName: string = '';
  regEmail: string = '';
  regPass: string = '';
  regConfirmPass: string = '';

  constructor(
    private authService: AuthService,
    private notify: NotificationService
  ) {}

  switchMode(toRegister: boolean) {
    this.isRegister = toRegister;
  }

  async onLogin() {
    const res = await this.authService.login(this.loginEmail, this.loginPass);
    if (res.success) {
      this.notify.showToast(res.message, 'success');
      this.loggedIn.emit();
    } else {
      this.notify.showToast(res.message, 'error');
    }
  }

  async onRegister() {
    if (!this.regName || !this.regEmail || !this.regPass) {
      this.notify.showToast('Please fill in all fields', 'warning');
      return;
    }

    if (this.regPass !== this.regConfirmPass) {
      this.notify.showToast('Passwords do not match', 'error');
      return;
    }

    const res = await this.authService.register(this.regName, this.regEmail, this.regPass);
    if (res.success) {
      this.notify.showToast(res.message, 'success');
      this.loggedIn.emit();
    } else {
      this.notify.showToast(res.message, 'error');
    }
  }
}
