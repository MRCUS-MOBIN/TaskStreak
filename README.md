# 🔥 TaskStreak - Daily Productivity & Streak Engine

**TaskStreak** is a full-featured productivity application designed to help users plan tasks the night before for tomorrow, execute them during the day, complete required tasks, and build an uninterrupted daily productivity streak.

---

## 🌟 Core Workflow & Differentiating USP

```text
       NIGHT
         ↓
  Plan Tomorrow
         ↓
  Save & Lock Plan
         ↓
      12:00 AM (MIDNIGHT)
         ↓
     NEW DAY
         ↓
   Today's Tasks
         ↓
   Work & Complete Tasks
         ↓
All Required Tasks Done?
    ↙          ↘
  YES           NO
   ↓             ↓
🔥 Streak +1   Streak Breaks
```

### 🎯 Key Differentiating Feature: "Tomorrow Planning Lock"
Unfinished low-priority tasks do **not** destroy your streak. Each day defines **Required for Streak** (`requiredForStreak: true`) tasks. If all required tasks for a day are completed, your **Daily Streak** increments!

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Angular 19 (Standalone Components, TypeScript, RxJS, Reactive Forms)
- **Backend API**: Node.js, Express.js, REST endpoints
- **Database**: MongoDB & Mongoose ORM
- **State & Storage**: RxJS BehaviorSubjects + LocalStorage persistence & Seed Engine
- **Styling**: Premium Custom Vanilla CSS (CSS variables, glassmorphic dark theme, animations)

---

## 🚀 Key Modules & Features

1. **☀️ Today's Dashboard**:
   - Greeting & Date display
   - 🌙 Night Planning Banner reminder
   - 🔥 Current Streak & 🏆 Longest Streak metric cards
   - ⚡ Required Tasks Status tracker (`5 / 5 Required Completed - 🔥 Streak Ready!`)
   - Interactive Progress Bar with dynamic completion percentage
   - Filter & Search (Priority: High 🔴 / Medium 🟠 / Low 🟢, Category, Status, Title search)
   - Priority-sorted list (HIGH -> MEDIUM -> LOW)

2. **🌙 Plan Tomorrow (Night Planning Lock)**:
   - Automatically pre-selects tomorrow's date
   - Create tomorrow's task schedule (Title, Description, Priority, Category, Duration, Streak Requirement)
   - Realtime preview of tomorrow's queue grouped by priority
   - **Lock & Save Plan** action

3. **📅 Productivity Calendar**:
   - Interactive monthly calendar grid
   - Color-coded day status indicators:
     - 🟢 **Fully Completed** (All required tasks done)
     - 🟡 **Partially Completed** (Some tasks done)
     - 🔴 **Missed Required Tasks** (Past day with incomplete required tasks)
     - ⚪ **No Tasks**
   - Click any date cell to open a **Day Detail Modal** showing exact task list and statistics!

4. **📊 Analytics Dashboard**:
   - **Weekly Task Completion**: Visual bar chart showing Mon–Sun completion rates
   - **Priority Distribution**: High 🔴, Medium 🟠, Low 🟢 breakdown bars
   - **Category Distribution**: Percentage breakdown across Coding 💻, College 📚, Project 🚀, Placement 💼, Fitness 🏃, Personal 🏠, Learning 📖, Other 📌
   - **Key Metrics Grid**: Total Tasks, Completed Tasks, Pending Tasks, Completion Rate %, Current & Longest Streak, Top Category

5. **👤 User Profile & Badges**:
   - Profile Header with initials avatar & user info
   - Achievement Badges (🔥 7-Day Streak Master, 🌙 Night Planner, 🎯 High Achiever)
   - Edit Profile & Password update
   - Browser Notification toggle (HTML5 Notification API)
   - Refresh task data from the server

---

## 💻 How to Run

### MongoDB
The API connects to the MongoDB server specified by `MONGO_URI` in `server/.env`. MongoDB Compass is a GUI client; make sure a local MongoDB Community Server is running, or use an Atlas connection string. For a local server, use:

```env
MONGO_URI=mongodb://127.0.0.1:27017/taskstreak
```

Open the same URI in MongoDB Compass to view the `taskstreak` database. Keep `JWT_SECRET` private and replace the example value before deployment.

### Backend (Node.js + Express)
In the first terminal:

```bash
cd server
npm install
npm run dev
```

The API health check is **`http://localhost:5000/api/health`**. To create or refresh only the demo account and its tasks, run `npm run seed` in another terminal from `server`.

### Frontend (Angular)
In a second terminal:

```bash
cd client
npm install
npm start
```
Open the Local URL printed by Angular. If port `4200` is occupied, Angular may choose another one; development CORS permits localhost ports. For deployment, set `window.TASKSTREAK_API_URL` to the public API base URL ending in `/api` before Angular loads. The local default is `http://localhost:5000/api`.

Sign in with the seeded demo account: **`mobin@taskstreak.app` / `password123`**. Registration, login, task data, profile changes, streak stats, and plan locks use the Express API; MongoDB must be available for these flows.

---

## 📁 Repository Directory Structure

```text
taskstreak/
│
├── client/                      # Angular Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── analytics/    # Analytics Dashboard view
│   │   │   │   ├── auth/         # Login & Register views
│   │   │   │   ├── calendar/     # Monthly Productivity Calendar
│   │   │   │   ├── dashboard/    # Today's Tasks view
│   │   │   │   ├── plan-tomorrow/# Night Planning view
│   │   │   │   └── profile/      # User profile & settings
│   │   │   ├── models/           # Task & User TypeScript interfaces
│   │   │   ├── services/         # Storage, Auth, & Notification services
│   │   │   ├── app.component.ts
│   │   │   └── app.config.ts
│   │   ├── styles.css            # Dark mode glassmorphic CSS design system
│   │   └── index.html
│   └── angular.json
│
├── server/                      # Express & Node.js Server
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── routes/
│   │   └── server.js
│   └── package.json
│
└── README.md
```

---

## 🛡️ License
MIT License - Built for portfolio presentation.
