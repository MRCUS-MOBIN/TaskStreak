import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStorageService } from '../../services/task-storage.service';
import { Task, DayProgress } from '../../models/task.model';

interface CalendarDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  progress: DayProgress;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html'
})
export class CalendarComponent implements OnInit {
  currentDate: Date = new Date();
  displayMonthStr: string = '';
  calendarDays: CalendarDay[] = [];
  selectedDayProgress: DayProgress | null = null;
  selectedDayTasks: Task[] = [];
  showDayModal: boolean = false;

  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  constructor(public taskStorage: TaskStorageService) {}

  ngOnInit() {
    this.generateCalendar();
    this.taskStorage.tasks$.subscribe(() => {
      this.generateCalendar();
      if (this.selectedDayProgress) {
        this.selectDate(this.selectedDayProgress.date);
      }
    });
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    this.displayMonthStr = this.currentDate.toLocaleDateString('en-US', options);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6 adjustment
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const todayStr = this.taskStorage.getTodayStr();

    const days: CalendarDay[] = [];

    // Prev month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = this.taskStorage.formatDate(d);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        progress: this.taskStorage.getDayProgress(dateStr)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = this.taskStorage.formatDate(d);
      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        progress: this.taskStorage.getDayProgress(dateStr)
      });
    }

    // Next month padding days to complete grid (multiples of 7)
    const totalGridCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalGridCells - days.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      const dateStr = this.taskStorage.formatDate(d);
      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        progress: this.taskStorage.getDayProgress(dateStr)
      });
    }

    this.calendarDays = days;
  }

  prevMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    this.generateCalendar();
  }

  selectDate(dateStr: string) {
    this.selectedDayProgress = this.taskStorage.getDayProgress(dateStr);
    this.selectedDayTasks = this.taskStorage.getTasks(dateStr);
    this.showDayModal = true;
  }

  async toggleTask(task: Task) {
    if (!task.id) return;
    await this.taskStorage.toggleTaskComplete(task.id);
    if (this.selectedDayProgress) {
      this.selectedDayTasks = this.taskStorage.getTasks(this.selectedDayProgress.date);
      this.selectedDayProgress = this.taskStorage.getDayProgress(this.selectedDayProgress.date);
    }
  }

  closeModal() {
    this.showDayModal = false;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'FULL': return '🟢';
      case 'PARTIAL': return '🟡';
      case 'MISSED': return '🔴';
      default: return '⚪';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'FULL': return 'badge-full';
      case 'PARTIAL': return 'badge-partial';
      case 'MISSED': return 'badge-missed';
      default: return 'badge-empty';
    }
  }
}
