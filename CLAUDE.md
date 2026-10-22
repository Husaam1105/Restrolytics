@AGENTS.md

## Skills in this repo (`.claude/skills/`)

Pick by task:

- **Building or restyling UI:** `frontend-design` for direction, then `make-interfaces-feel-better` for the details (radii, shadows, motion, hit areas, tabular numbers). Fix things in Tailwind and the tokens in `src/styles.css`; never add a second styling system.
- **Icons:** the app uses `lucide-react`; keep it. Use the `better-icons` MCP only to find a lucide icon or to fetch brand logos (Toast, Uber Eats, DoorDash, Grubhub, Google) from `simple-icons`. Don't install better-icons globally.
- **Copy:** `no-ai-slop` for any user-facing text (UI strings, empty states, toasts, emails). For long public-website copy, follow with `humanizer`, then check against `anti-ai-slop-writing`. Never invent stats, customers or testimonials.
- **Exploring visual directions:** `superdesign`. Send it written briefs and screenshots only. **Never** pass `.env*`, `src/integrations/**`, `**/*.server.ts`, `supabase/**`, or customer data as context; uploads leave this machine.

## Conventions

- Colors are oklch tokens in `src/styles.css`; use token classes (`bg-primary`, `text-success`) and never raw palette classes (`text-emerald-600`) or hex.
- Server functions live in `src/lib/*.functions.ts`, server-only code in `*.server.ts`. Manager-only actions call `requireManager()` on the server; hiding a button is not access control.
- Run `npm run typecheck` and `npm run build` before committing.
