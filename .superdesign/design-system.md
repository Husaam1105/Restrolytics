# Restrolytics design system

## Product
Restrolytics is restaurant operations software for independent restaurant owners and their managers (1-10 locations). It brings together:
- Sales: Toast POS exports, Uber Eats reports (DoorDash and Grubhub import coming), catering orders.
- Inventory: vendors and their order days, storage-area stock counts on a phone, invoice photos read by AI.
- Shifts: opening/closing checklists for front of house and kitchen with photo proof, schedule, staff timeclock.
- Payroll: weekly pay sheets, tip pools split by hours, payouts staff confirm.
- IQ Copilot: chat that answers only from the restaurant's own data; staff see only their own records.
- Live manager: an optional human Restrolytics manager working inside the account (Virtual Manager plan).

Audience: owners and general managers, often on a phone at close. Job to be done: "Know what happened tonight and what to fix tomorrow, without opening five apps."

Tone: plain, specific, kitchen vernacular (tickets, 86'd, close-out, par). No hype, no invented stats; example data is always labelled as an example.

## Pages
Public: `/` landing, `/pricing`, `/contact` (walkthrough request), `/privacy`, `/terms`.
App: dashboard, sales, inventory, shifts/checklists, timeclock, employees, payroll, IQ Copilot, settings.

## Current visual direction ("Ticket rail")
- Palette (oklch): paper background 0.986 0.003 80 (near white), ink 0.23 0.035 228 (deep blue-green; text, app sidebar, dark marketing bands), primary "spruce" 0.36 0.07 222, accent "lagoon" 0.62 0.115 200, marketing-only highlight "saffron" 0.84 0.13 82 (on ink only). Semantic: destructive 0.54 0.2 25, warning 0.79 0.15 75, success 0.52 0.12 152.
- Type: Archivo Variable only. Headlines in condensed widths (72-82%), heavy (700-800), tight leading; body normal width 16px; all numbers tabular.
- Signature: hero is an ink band with a big condensed headline and a rail of paper kitchen tickets (Toast, Uber Eats, DoorDash, catering) ending in a saffron "Tonight, so far" close-out ticket with an IQ note.
- Surfaces: white cards, radius 16px, layered soft shadows instead of borders; buttons radius 10px, 40-44px tall.
- Avoid: all-caps eyebrow labels, arrows appended to button text, middle-dot meta strings, gradient washes, purple/indigo, cream backgrounds with terracotta.

## Motion
One orchestrated entrance only (tickets drop onto the rail, ~90ms stagger). Hover/press feedback is instant (<=150ms), press scales to 0.96. Respect reduced motion.
