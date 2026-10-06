import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { User } from '../models/user.model';
import { API_BASE_URL, AUTH_TOKEN_KEY } from './api.config';

interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  currentStreak: number;
  longestStreak: number;
  createdAt?: string;
  token: string;
}

interface CurrentUserResponse {
  _id: string;
  name: string;
  email: string;
  currentStreak: number;
  longestStreak: number;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private STORAGE_KEY = 'taskstreak_user';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem(this.STORAGE_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    let initialUser: User | null = null;

    if (savedUser && token) {
      try {
        initialUser = JSON.parse(savedUser);
      } catch (e) {
        initialUser = null;
      }
    }

    if (!initialUser) this.clearSession();

    this.currentUserSubject = new BehaviorSubject<User | null>(initialUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
    if (initialUser) void this.restoreSession();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  async register(name: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
    if (!name || !email || !password) {
      return { success: false, message: 'All fields are required.' };
    }

    try {
      const result = await firstValueFrom(this.http.post<AuthResponse>(`${API_BASE_URL}/auth/register`, {
        name: name.trim(), email: email.trim().toLowerCase(), password
      }));
      this.setSession(result);
      return { success: true, message: 'Account created successfully!' };
    } catch (error: any) {
      return { success: false, message: error.error?.message || 'Could not register. Check the API and database connection.' };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    try {
      const result = await firstValueFrom(this.http.post<AuthResponse>(`${API_BASE_URL}/auth/login`, {
        email: email.trim().toLowerCase(), password
      }));
      this.setSession(result);
      return { success: true, message: 'Welcome back!' };
    } catch (error: any) {
      return { success: false, message: error.error?.message || 'Could not log in. Check the API and database connection.' };
    }
  }

  async updateProfile(name: string, email: string, currentPassword?: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await firstValueFrom(this.http.put<AuthResponse>(`${API_BASE_URL}/auth/me`, {
        name: name.trim(), email: email.trim().toLowerCase(), currentPassword, newPassword
      }));
      this.setSession(result);
      return { success: true, message: 'Profile updated successfully!' };
    } catch (error: any) {
      return { success: false, message: error.error?.message || 'Could not update profile.' };
    }
  }

  updateStreakStats(currentStreak: number, longestStreak: number) {
    const current = this.currentUserValue;
    if (!current) return;

    const updated: User = {
      ...current,
      currentStreak,
      longestStreak: Math.max(current.longestStreak, longestStreak, currentStreak)
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this.currentUserSubject.next(updated);
  }

  logout() {
    this.clearSession();
    this.currentUserSubject.next(null);
  }

  private setSession(result: AuthResponse) {
    const user: User = {
      id: result._id,
      name: result.name,
      email: result.email,
      currentStreak: result.currentStreak || 0,
      longestStreak: result.longestStreak || 0,
      createdAt: result.createdAt || new Date().toISOString()
    };
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private async restoreSession() {
    try {
      const user = await firstValueFrom(this.http.get<CurrentUserResponse>(`${API_BASE_URL}/auth/me`));
      const restored: User = {
        id: user._id,
        name: user.name,
        email: user.email,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        createdAt: user.createdAt || new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(restored));
      this.currentUserSubject.next(restored);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.clearSession();
        this.currentUserSubject.next(null);
      }
    }
  }

  private clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
