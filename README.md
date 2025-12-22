<p align="center">
  <img src="public/icons/site_logo.png" alt="JobFlow Logo" width="80" height="80" />
</p>

<h1 align="center">JobFlow</h1>

<p align="center">
  <strong>Your Personal Job Application Tracker</strong>
</p>

<p align="center">
  A beautiful, modern job search management app built with Next.js 16, React 19, and Supabase.<br/>
  Track applications, schedule interviews, manage offers, and land your dream job.
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
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
</p>

---

## ✨ Features

### 📊 **Dashboard Overview**
- Real-time statistics with beautiful animated charts
- Weekly/monthly application trends visualization
- Quick-add actions for applications, interviews, and notes
- Upcoming interviews countdown timer
- Recent activity feed

### 📝 **Application Management**
- Track applications through every stage of the pipeline
- Rich filtering by location, employment type, source, and date ranges
- Add company logos, salary info, and detailed notes
- Move applications between stages with one click

### 📅 **Interview Scheduling**
- Schedule phone, video, and in-person interviews
- Calendar view with event visualization
- Day-by-day breakdown sidebar
- Application statistics by time period

### 💼 **Offers & Negotiations**
- Track received offers with salary and start date
- Mark offers as accepted, pending, or declined
- Keep negotiation notes organized

### 📋 **Additional Features**
- **Wishlist** - Save dream jobs to apply later
- **Rejected/Withdrawn** - Learn from past applications
- **Notes** - Color-coded sticky notes for quick reminders
- **Job Search** - AI-powered job suggestions (coming soon)

### ⚙️ **Settings & Data**
- **Dual Storage Mode** - Works offline (IndexedDB) or synced (Supabase)
- **Import/Export** - Full JSON backup and restore
- **Email Reminders** - Weekly digest and interview reminders
- **Browser Notifications** - Never miss an interview
- **Theme Support** - Light mode with beautiful gradients

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) with App Router & Turbopack |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Backend** | [Supabase](https://supabase.com/) (Auth, Postgres, Edge Functions) |
| **Offline Storage** | [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via `idb` |
| **Email** | [Resend](https://resend.com/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account (optional, for cloud sync)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/jobflow.git
   cd jobflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Guest Mode

Don't want to create an account? No problem! The app works fully offline using IndexedDB. Your data stays in your browser until you decide to sync.

---

## 📦 Deployment

### Deploy to Vercel

The easiest way to deploy is with Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/jobflow)

### Environment Variables

Set these in your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `RESEND_API_KEY` | (Optional) For email notifications |

---

## 📁 Project Structure

```
jobflow/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (cron, reminders)
│   ├── applied/           # Applications page
│   ├── calendar/          # Calendar view
│   ├── interviews/        # Interviews management
│   ├── job-search/        # Job search (AI-powered)
│   ├── notes/             # Notes page
│   ├── offers-received/   # Offers tracking
│   ├── rejected/          # Rejected applications
│   ├── settings/          # App settings
│   ├── wishlist/          # Job wishlist
│   └── withdrawn/         # Withdrawn applications
├── components/
│   ├── cards/             # Reusable card components
│   ├── dialogs/           # Modal dialogs
│   ├── filters/           # Filter components
│   ├── layout/            # App shell, sidebar, topbar
│   ├── overview/          # Dashboard cards
│   └── ui/                # Base UI components
├── lib/
│   ├── constants/         # App constants
│   ├── services/          # Data services (CRUD operations)
│   ├── supabase/          # Supabase client & helpers
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/
│   └── icons/             # App icons
└── supabase/
    ├── functions/         # Edge functions
    └── migrations/        # Database migrations
```

---

## 🗄️ Database Schema

The app uses Supabase Postgres with the following main tables:

- `applied` - Job applications
- `interviews` - Scheduled interviews
- `offers` - Received job offers
- `rejected` - Rejected applications
- `withdrawn` - Withdrawn applications
- `wishlist` - Saved job listings
- `notes` - User notes
- `activity` - Activity log

---

## 🔐 Authentication

- **Email/Password** - Traditional sign up and login
- **Magic Link** - Passwordless email authentication
- **OAuth** - Google, GitHub (configurable in Supabase)

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Lucide](https://lucide.dev/) - Beautiful open-source icons
- [Framer Motion](https://www.framer.com/motion/) - Production-ready animations

---

<p align="center">
  Made with ❤️ for job seekers everywhere
</p>

<p align="center">
  <a href="#jobflow">⬆ Back to top</a>
</p>
