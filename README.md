# Mindful_Makers_13 — Plant Logbook

A real web app for the 13th Mindful Makers hackathon: photograph a plant, have
**Claude vision** identify the species, and save it to your personal logbook.

**Stack:** Next.js 15 (App Router, TypeScript) · Supabase (Postgres + Auth +
Storage) · Anthropic Claude (`claude-opus-4-8`) · deploys to Vercel.

> The original single-file prototype lives in `index.html` + `main.py` (kept for
> reference). The app below replaces it.

---

## 1. Prerequisites

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic API key](https://console.anthropic.com)
- A [Vercel](https://vercel.com) account (for deploy)

## 2. Configure Supabase

1. Create a Supabase project. From **Project Settings → API**, copy the
   **Project URL** and the **anon / publishable** key.
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the
   `plants` table with row-level security, and a public `plant-photos` storage
   bucket with per-user upload policies.
3. (Auth) Email/password sign-in works out of the box. For the smoothest demo,
   under **Authentication → Providers → Email**, keep "Confirm email" **off**
   (the shared project already has auto-confirm on), so sign-ups get a session
   immediately. The HTML prototype (`index.html`) uses the same email/password
   auth against the same project, so accounts are shared between both.

## 3. Local development

```sh
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Fill `.env.local` with:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (server-only) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally |

Open http://localhost:3000 — you'll be redirected to `/login`. Sign up (or sign
in) with an email + password and you're in. Accounts are shared with the
`index.html` prototype, since both point at the same Supabase project.

## 4. How it works

- **Auth** — email/password via Supabase (matches the `index.html` prototype, so
  the two share one user pool). `middleware.ts` refreshes the session on every
  request, redirects anonymous users to `/login`, and lets `/api/*` return JSON
  401s instead of redirecting.
- **Add a plant** — the camera/upload sheet (`app/components/AddPlantSheet.tsx`)
  captures a photo and POSTs it to `app/api/identify/route.ts`, which:
  1. authenticates the user,
  2. sends the image to `claude-opus-4-8` (a forced tool call returns structured
     name / scientific name / tags / about / care / confidence — see
     `lib/anthropic.ts`),
  3. uploads the photo to Supabase Storage under `<user_id>/…`,
  4. inserts a `plants` row (RLS scopes it to the user).
- **Browse** — home grid (`app/page.tsx`), logbook by location
  (`app/logbook`, `app/places/[location]`), and plant detail (`app/plant/[id]`).

## 5. Deploy to Vercel

```sh
# from this directory
npx vercel            # first run links/creates the project
npx vercel --prod     # production deploy
```

Or connect the GitHub repo in the Vercel dashboard. Either way, set the four
environment variables in **Vercel → Project → Settings → Environment Variables**
(use the production URL for `NEXT_PUBLIC_SITE_URL`, e.g.
`https://your-app.vercel.app`). Then add `https://your-app.vercel.app/auth/callback`
to the Supabase redirect allow-list.

## 6. Scripts

```sh
npm run dev     # local dev server
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint
```

---

Hackathon notes & design doc:
https://docs.google.com/document/d/1NDqzh1C6GnRYC857OqeCs-QwSiZM8DlyHvwOZ6hu8yw/edit
