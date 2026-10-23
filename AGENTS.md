# Restrolytics: working agreements

Product rules that the code relies on. Keep them true when you change things.

- Keep payroll employee-centric: each employee owns their hours, rate, payout status, notes, and login link, because this mirrors the restaurant's per-person payroll workbook.
- Combined payroll date ranges are read-only summaries across weekly pay sheets; editing and payout actions stay within a single week to preserve each employee's audit trail.
- Staff usernames sign in as `<username>@kaizr.staff` behind the scenes (auth page appends the domain when no "@"), because staff have no real email at onboarding.
- Keep `/` public for the Restrolytics SaaS website and `/dashboard` protected for signed-in restaurant operations, so acquisition and product use remain clearly separated.
- IQ Copilot streams via src/routes/api/copilot.ts with a role-scoped data snapshot (copilot-context.server.ts) in the prompt, not tools — keeps staff data isolation server-side and answers grounded.
- Restrolytics Manager: platform_staff table + is_platform_staff() gate cross-restaurant access; chat/tasks/notes use browser client + RLS + realtime (simple CRUD, RLS enforces isolation).
- Date-range presets (Today/…/Custom, Monday-start weeks) live in src/lib/date-ranges.ts and are reused by every reporting page, so ranges stay consistent app-wide. Exception: fixed rolling windows (dashboard "last 7/30 days" trend tiles, Copilot's context snapshot) count back from the restaurant's operating day, because they are trends rather than user-picked ranges.
