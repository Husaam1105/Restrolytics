# Restrolytics

Restaurant operations in one place: sales across POS and delivery apps, inventory and vendor orders, shifts and checklists, timeclock and payroll, plus IQ, an AI copilot that answers from your own numbers.

- `/` is the public website. `/dashboard` and everything under it requires sign-in.
- Built with TanStack Start (React 19, file routes), Supabase (Postgres, Auth, Storage, Realtime), Tailwind CSS v4 and shadcn/ui.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project values
npm run dev            # http://localhost:8080
```

Setting up a fresh Supabase project (schema, auth providers, storage) is covered in [docs/setup.md](docs/setup.md).

## Scripts

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Dev server with HMR              |
| `npm run build`     | Production build into `.output/` |
| `npm start`         | Run the built Node server        |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run lint`      | ESLint                           |

## Deploying

The build uses [Nitro](https://nitro.build). By default it produces a portable Node server (`node .output/server/index.mjs`). To target a platform, set `NITRO_PRESET` at build time, for example `vercel`, `netlify` or `cloudflare-module`, and add the variables from `.env.example` to that platform.

## Project layout

```
src/routes/            file-based routes (public site, /_authenticated app, /api)
src/components/        app components; ui/ holds shadcn primitives
src/lib/*.functions.ts server functions called from the UI
src/lib/*.server.ts    server-only helpers
supabase/migrations/   database schema and RLS policies
```

Product rules the code depends on are in [AGENTS.md](AGENTS.md).
