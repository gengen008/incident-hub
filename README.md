# Incident Hub — Corporate Incident Management System

Enterprise-grade incident reporting, tracking, and resolution platform for multi-departmental organizations. Built with Next.js 15, Supabase, and a bespoke OKLCH design system.

---

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** — PostgreSQL + Auth + Storage + Realtime
- **Tailwind CSS v4** with OKLCH color system
- **React Hook Form + Zod** — form validation
- **Recharts** — analytics charts
- **Space Grotesk** / **IBM Plex Sans** / **IBM Plex Mono** — type system

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> incident-hub
cd incident-hub
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your URL and anon key

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run database migrations

In the Supabase dashboard → **SQL Editor**, run these in order:

```sql
-- 1. Schema + triggers
-- Paste content of: supabase/migrations/001_schema.sql

-- 2. Row Level Security policies
-- Paste content of: supabase/migrations/002_rls.sql

-- 3. Seed departments
-- Paste content of: supabase/migrations/003_seed.sql
```

### 4. Create Storage bucket

In Supabase dashboard → **Storage**:
1. Create a bucket named `incident-photos`
2. Set it to **Public** (or configure signed URLs if you need private)
3. Add policy: Allow authenticated users to upload/read

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## First-time setup

1. Sign up at `/signup` — the first user should be made an admin
2. To promote a user to admin: in Supabase SQL Editor run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```
3. Log in and go to **Administration → Departments** to create your departments
4. Go to **Administration → Users** to assign roles and department heads

---

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full access — all incidents, all departments, user management |
| `department_head` | Department incidents + reports for their department |
| `user` | Own incidents + incidents assigned to them |

---

## Features

- **Incident Reporting** — multi-section form with photo upload (drag & drop + camera capture), priority selection, department routing
- **Incident Detail** — full info, photo gallery lightbox, status updates with reason, status timeline, threaded comments, reassignment
- **Dashboard** — KPI strip, quick actions, recent incident feed
- **Admin Panel** — company-wide stats, department management (CRUD + head assignment), user management (roles, deactivation, password reset)
- **Reports** — Recharts analytics: monthly trend, priority distribution, status breakdown, top categories + CSV export
- **Notifications** — real-time in-app notifications, mark read/all read
- **Settings** — profile edit, password change, notification preferences
- **Auth** — login, signup, forgot password, reset password
- **Mobile-first** — responsive at all breakpoints, mobile bottom nav bar

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # login, signup, forgot-password, reset-password
│   ├── (dashboard)/      # all authenticated routes
│   │   ├── dashboard/    # home dashboard
│   │   ├── incidents/    # list, [id], new
│   │   ├── admin/        # admin overview, departments, users, reports
│   │   ├── reports/      # dept-head reports
│   │   ├── notifications/
│   │   └── settings/
│   ├── globals.css       # design system (OKLCH tokens + component classes)
│   └── layout.tsx        # root layout + fonts
├── components/
│   ├── incidents/        # CommentSection, PhotoUpload, StatusTimeline
│   ├── layout/           # Sidebar, Topbar
│   └── ui/               # Button, Badge, Avatar, Modal, DataTable, etc.
├── lib/
│   ├── auth.ts           # role helpers
│   ├── hooks/            # useProfile, useNotifications
│   ├── supabase/         # client.ts, server.ts
│   ├── toast.ts          # toast wrappers
│   └── utils.ts          # cn, formatDate, exportToCSV, etc.
├── middleware.ts          # route protection
└── types/index.ts        # all TypeScript interfaces
```

---

## Design System

All colors are OKLCH for perceptual uniformity:

```css
--color-brand:    oklch(34% 0.20 264)  /* deep navy */
--color-danger:   oklch(55% 0.20 25)   /* red */
--color-warning:  oklch(72% 0.17 65)   /* amber */
--color-success:  oklch(58% 0.15 155)  /* green */
--color-info:     oklch(62% 0.16 248)  /* blue */
```

Typography: **Space Grotesk** (display) + **IBM Plex Sans** (body) + **IBM Plex Mono** (IDs/timestamps)

---

## Deployment

### Vercel (recommended)

```bash
npx vercel
```

Set the environment variables in your Vercel project settings.

### Environment variables needed

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (your production URL)
- `SENDGRID_API_KEY` (optional — for email notifications)
