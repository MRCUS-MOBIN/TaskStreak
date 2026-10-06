import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$: Observable<ToastMessage[]> = this.toastsSubject.asObservable();

  showToast(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    const toast: ToastMessage = { id, type, message };
    const current = this.toastsSubject.value;

    this.toastsSubject.next([...current, toast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      this.removeToast(id);
    }, 4000);
  }

  removeToast(id: string) {
    const filtered = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(filtered);
  }

  async requestBrowserNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      this.showToast('Browser notifications are not supported in this browser.', 'warning');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.showToast('Notifications are already enabled!', 'success');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showToast('Browser notifications enabled successfully!', 'success');
        return true;
      }
    }

    this.showToast('Notification permission was denied.', 'warning');
    return false;
  }

  sendBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'assets/icon.png'
      });
    }
  }
}
