# Setting up Restrolytics on a new Supabase project

This takes about 20 minutes. You need a [Supabase](https://supabase.com) account and Node 22+.

## 1. Create the project

1. In the Supabase dashboard, create a new project. Pick the region closest to your restaurants.
2. Copy `.env.example` to `.env` and fill in, from **Project Settings → API**:
   - `VITE_SUPABASE_URL` and `SUPABASE_URL`: the project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_PUBLISHABLE_KEY`: the publishable (anon) key
   - `SUPABASE_SERVICE_ROLE_KEY`: the secret (service role) key. Server only; never put it in a `VITE_` variable.

## 2. Apply the schema

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`db push` runs everything in `supabase/migrations/` in order: tables, row-level security, helper functions and the private `task-photos` storage bucket.

To check the migrations locally without Docker:

```bash
npm run db:check   # replays every migration in an embedded Postgres
npm test           # also runs the row-level security tests
```

## 3. Auth settings

In **Authentication → URL Configuration**:

- **Site URL:** your production URL, e.g. `https://app.restrolytics.com`
- **Redirect URLs:** add exact URLs, not wildcards: `http://localhost:8080/auth/reset`, `http://localhost:8080/dashboard`, `https://<your-domain>/auth/reset` and `https://<your-domain>/dashboard`.
- Set `SITE_URL` in the server environment to your public URL; invite and reset emails link to it.

In **Authentication → Providers**:

- **Email:** keep it enabled. Turn **off** "Allow new users to sign up" if you want accounts created only through invites and the Employees page.
- **Google (optional):** create an OAuth client in Google Cloud Console (type *Web application*). Add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI, then paste the client ID and secret into Supabase.

## 4. Make yourself Restrolytics staff

Restrolytics is invite-only. Platform staff can create restaurants and use the manager console. After you've signed in once, run this in the SQL editor:

```sql
insert into public.platform_staff (user_id)
select id from auth.users where lower(email) = 'you@example.com'
on conflict do nothing;
```

Then sign in, create the first restaurant, and invite its owner from **Settings → Team access**.

## 5. Optional services

| Feature | Variables | Notes |
|---|---|---|
| IQ Copilot, Manager Assist, invoice reader | `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL_CHAT`, `AI_MODEL_VISION` | Leave `AI_PROVIDER` empty and these features show "not set up yet" instead of failing. |
| Daily vendor order sync | `VENDOR_SYNC_SECRET` | Generate with `openssl rand -hex 32`. Have your scheduler call `POST /api/public/hooks/vendor-sync` with `Authorization: Bearer <secret>`. |

## Hosting notes

- **Outbound requests:** the vendor-sync scraper only fetches public `https://` hostnames, and on the Node server each connection is pinned to an address checked as public (no private, loopback, link-local, CGNAT or non-global IPv6), including every redirect hop. Blocking private egress at the host is still a good second layer.
- **Cloudflare Workers:** vendor sync uses `node:dns` and the `undici` dispatcher for that pinning, which Workers don't provide. On Workers, vendor sync will refuse to run; keep it on a Node host or move it to a separate Node worker.

## Moving data from the old Lovable Cloud project

Two options, depending on what Lovable gives you access to:

- **Database connection string available:** `pg_dump --data-only --schema=public` from the old project, then restore into the new one *after* `db push`.
- **Dashboard only:** export each table as CSV from the table editor and import them in the same order the migrations create them: restaurants and members first, then employees, then everything else.

Things that can't be copied:

- **Passwords.** Users have to be re-created. Invite owners and managers again, and create staff logins on the Employees page.
- **User IDs.** Re-created users get new IDs, so update `user_id` columns (`restaurant_members`, `employees`, `profiles`) to match.
- **Open shifts.** The new schema allows one open clock-in per employee, so close any duplicate open shifts before importing `time_entries`.
