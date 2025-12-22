<p align="center">
  <img src="public/icons/site_logo.png" alt="Applications Tracker Logo" width="100" height="100" />
</p>

<h1 align="center">Applications Tracker</h1>

<p align="center">
  <strong>Track Your Job Search Journey</strong>
</p>

<p align="center">
  A modern, full-featured job application management system built with Next.js 16, React 19, and Supabase.<br/>
  Organize applications, schedule interviews, track offers, and stay on top of your job search.
</p>

<p align="center">
  <a href="https://applicationstracker.vercel.app/" target="_blank"><strong>🌐 Live Demo</strong></a>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-project-structure">Structure</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
</p>

---

## ✨ Features

### 📊 Dashboard Overview
- **Real-time statistics** with animated bar and line charts (Recharts)
- **Weekly application trends** — visualize your activity over time
- **Quick-add buttons** for applications, interviews, and notes
- **Live countdown timer** for upcoming interviews
- **Recent activity feed** — track every action in your job search
- **Customizable goals** — set weekly/monthly targets for interviews and offers

### 📝 Application Management
- Track applications through the full pipeline: Applied → Interview → Offer/Rejected/Withdrawn
- **Rich filtering** by location, employment type (Full-time, Part-time, Internship, Contract, etc.), source, and date ranges
- Upload **company logos** or auto-fetch from URL
- Store **salary expectations**, contact details, and detailed notes
- **One-click stage transitions** with dedicated dialogs

### 📅 Interview Scheduling
- Schedule **phone, video, and in-person** interviews
- **Interactive calendar** with month navigation and event dots
- **Day sidebar** showing all events for the selected date
- **Statistics section** with applications by time period
- Live countdown to your next interview

### 💼 Offers Management
- Track received offers with **salary, start date, and company details**
- Mark offers as **Accepted**, **Pending**, or **Declined**
- Store negotiation notes and decision history
- View accepted offers separately for a clear overview

### 🌟 Wishlist
- Save **dream jobs** to apply later
- Set priority levels: **Dream, High, Medium, Low**
- Auto-icon matching based on job title (Developer, Designer, etc.)
- Move wishlist items directly to applications when ready

### 📋 Notes
- **Color-coded sticky notes** (8 colors: gray, blue, green, yellow, orange, red, pink, purple)
- **Pin important notes** to keep them at the top
- **Tag system** for organization
- Quick search and filter by color or date

### 🔍 Job Search
- Integrated job search with smart autocomplete
- **Profession and location suggestions**
- Filter by distance, employment type, and more
- Save jobs directly to wishlist with one click

### ⚙️ Settings & Data Management
- **Dual Storage Mode**:
  - **Guest Mode** — fully offline using IndexedDB, no account required
  - **User Mode** — sync across devices with Supabase
- **Import/Export** — full JSON backup and restore of all data
- **Email Notifications**:
  - Interview reminder emails (via Resend)
  - Weekly digest summaries
- **Browser Notifications** — opt-in reminders for upcoming interviews
- **Collapsible sidebar** — save screen space with one click

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) with App Router & Turbopack |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + [tailwind-merge](https://github.com/dcastil/tailwind-merge) |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/) |
| **Charts** | [Recharts 3](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) + [Icons8](https://icons8.com/) (colorful PNG icons) |
| **UI Components** | [Radix UI](https://www.radix-ui.com/) (Checkbox, Dropdown, Label) |
| **Backend** | [Supabase](https://supabase.com/) (Auth, Postgres, Edge Functions) |
| **Offline Storage** | [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [`idb`](https://github.com/jakearchibald/idb) |
| **Email Service** | [Resend](https://resend.com/) |
| **Validation** | [Zod 4](https://zod.dev/) |
| **Font** | [Merriweather](https://fonts.google.com/specimen/Merriweather) (Google Fonts) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- **npm** (v10+), yarn, or pnpm
- **Supabase account** (optional — required only for cloud sync)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/applications-tracker.git
   cd applications-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   > Uses Turbopack for fast hot module replacement

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Guest Mode (No Account Required)

The app works **fully offline** without any signup. All data is stored locally in your browser using IndexedDB. You can export your data anytime and import it later — even after signing up to sync across devices.

---

## 📦 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/applications-tracker)

### Environment Variables

Set these in your Vercel project settings (Settings → Environment Variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Your Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | For emails | Service role key for Edge Functions |
| `RESEND_API_KEY` | For emails | Resend API key (starts with `re_`) |
| `CRON_SECRET` | For emails | Random string to secure cron endpoints |

### Email Reminders Setup

See [docs/EMAIL_REMINDERS.md](docs/EMAIL_REMINDERS.md) for detailed setup instructions for interview reminder emails.

---

## 📁 Project Structure

```
applications-tracker/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with AuthProvider
│   ├── page.tsx                 # Dashboard/Overview page
│   ├── api/                     # API routes
│   │   ├── cron/               # Scheduled jobs (Vercel Cron)
│   │   ├── jobs/               # Job search API
│   │   ├── send-reminders/     # Email reminder endpoint
│   │   └── suggest/            # Autocomplete suggestions
│   ├── applied/                 # Applications list page
│   ├── calendar/                # Calendar view with events
│   ├── interviews/              # Interviews management
│   ├── job-search/              # Job search page
│   ├── notes/                   # Sticky notes page
│   ├── offers-received/         # Offers tracking
│   ├── rejected/                # Rejected applications
│   ├── settings/                # Settings & data management
│   ├── wishlist/                # Job wishlist
│   └── withdrawn/               # Withdrawn applications
│
├── components/
│   ├── cards/                   # Application, Interview, Offer cards
│   ├── dialogs/                 # Modal dialogs (Add, Move, Schedule, etc.)
│   ├── filters/                 # Filter components with shared utilities
│   │   └── shared/             # Reusable filter components
│   ├── layout/                  # AppShell, Sidebar, TopBar
│   ├── overview/                # Dashboard cards (Stats, Goals, Notes, etc.)
│   └── ui/                      # Base UI components
│
├── lib/
│   ├── constants/               # App-wide constants & routes
│   ├── services/                # Data services (CRUD for each entity)
│   │   ├── applied.ts          # Applications service
│   │   ├── interviews.ts       # Interviews service
│   │   ├── offers.ts           # Offers service
│   │   ├── notes.ts            # Notes service
│   │   ├── wishlist.ts         # Wishlist service
│   │   ├── indexedDb.ts        # IndexedDB wrapper
│   │   └── ...
│   ├── supabase/                # Supabase client & session helpers
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Shared utility functions
│       ├── dateUtils.ts        # Date manipulation helpers
│       ├── filterUtils.ts      # Filter logic helpers
│       └── serviceUtils.ts     # Service layer utilities
│
├── public/
│   └── icons/                   # App icons (Icons8 colorful PNGs)
│
├── supabase/
│   ├── functions/               # Edge Functions (email sending)
│   └── migrations/              # Database schema migrations
│
└── docs/
    └── EMAIL_REMINDERS.md       # Email setup documentation
```

---

## 🗄️ Database Schema

The app uses **Supabase Postgres** with the following tables:

| Table | Description |
|-------|-------------|
| `applied` | Job applications with company, role, location, contact info |
| `interviews` | Scheduled interviews with date, type (phone/video/in-person) |
| `offers` | Received offers with salary, start date, acceptance status |
| `rejected` | Rejected applications with rejection date and reason |
| `withdrawn` | Withdrawn applications with withdrawal date and reason |
| `wishlist` | Saved job listings with priority level |
| `notes` | Color-coded sticky notes with tags and pin status |
| `activity` | Activity log for tracking all user actions |
| `user_email_preferences` | Email notification opt-in preferences |

---

## 🔐 Authentication

Powered by **Supabase Auth**:

- **Email/Password** — traditional sign up and login
- **Magic Link** — passwordless email authentication
- **OAuth Providers** — Google, GitHub, etc. (configurable in Supabase Dashboard)

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) — The React Framework for Production
- [Supabase](https://supabase.com/) — Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) — Production-ready animations
- [Lucide](https://lucide.dev/) — Beautiful open-source icons
- [Icons8](https://icons8.com/) — Colorful app icons
- [Radix UI](https://www.radix-ui.com/) — Unstyled, accessible components
- [Recharts](https://recharts.org/) — Composable charting library

---

<p align="center">
  <strong>Made with ❤️ for job seekers everywhere</strong>
</p>

<p align="center">
  <a href="https://applicationstracker.vercel.app/">🌐 Try it live</a> •
  <a href="#applications-tracker">⬆ Back to top</a>
</p>
