# Umpire Assignments — Setup Guide

Everything is **free**: Supabase (database + auth) + Vercel (hosting).

---

## Step 1 — Create a Supabase project

1. Go to https://supabase.com and sign up (free).
2. Click **New project**, give it a name (e.g. `umpire-assignments`), set a password, choose a region.
3. Wait ~1 minute for the project to be ready.
4. Open the **SQL Editor** (left sidebar) and paste the contents of `supabase/schema.sql`, then click **Run**.
5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **anon / public** key

---

## Step 2 — Create admin user

1. In Supabase, go to **Authentication → Users → Add user**.
2. Enter your email and a strong password. This is how you'll log into the admin panel.

---

## Step 3 — Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 4 — Run locally (optional)

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Step 5 — Deploy to Vercel (free hosting)

1. Push this folder to a GitHub repo (github.com → New repository → upload files).
2. Go to https://vercel.com and sign in with GitHub.
3. Click **Add New Project**, import your repo.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. Done! You'll get a free `.vercel.app` URL.

---

## Using the app

| Page | URL |
|------|-----|
| Public schedule | `/` |
| Admin login | `/admin/login` |
| Manage fixtures | `/admin` |
| Load games | `/admin/load-games` |
| Umpire list | `/admin/umpires` |
| Payments | `/admin/payments` |

### Loading fixtures
- **From CricClubs URL**: paste the league schedule URL on the Load Games page.
- **From CSV**: export from CricClubs and import on the same page. The existing `fixture.csv` format is supported.

### Assigning umpires
- Go to **Fixtures**, click **Edit** on any match, and pick Umpire 1 / Umpire 2 from the dropdown.

---

## Free tier limits (more than enough)

| Service | Free limit |
|---------|-----------|
| Supabase | 500 MB database, 50,000 monthly active users |
| Vercel | 100 GB bandwidth, unlimited deploys |
