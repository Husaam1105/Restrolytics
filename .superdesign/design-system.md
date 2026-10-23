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

## Visual direction ("Magenta Sorbet", chosen 2026-10-23)
Soft, premium and light-led. Restaurant tech is crowded with orange (Toast, 7shifts), so the brand owns raspberry-magenta.
- Palette (oklch): blush-white canvas 0.993 0.004 350, plum ink text 0.22 0.03 340, primary magenta 0.52 0.2 352, brand accent 0.57 0.21 352, pastel panels 0.955 0.03 350, deep plum ink band 0.25 0.06 345 for the one dark marketing section. Semantic: destructive 0.55 0.2 32 (pushed toward red-orange, away from magenta), warning 0.79 0.15 75, success 0.52 0.12 152.
- Type: Archivo Variable only. Headlines condensed (72-82% width), heavy, tight leading; body normal width 16px; numbers tabular.
- Hero: light. Headline left; the real product (example end-of-day report + an IQ answer) on a pink pastel panel on the right.
- Surfaces: white cards, radius 16px, layered soft shadows instead of borders; buttons radius 10px, 40-44px tall. Light app sidebar with a magenta active marker.
- Avoid: all-caps eyebrow labels, arrows appended to button text, middle-dot meta strings, gradient washes, dark full-page themes by default.

## Motion
One orchestrated entrance at most. Hover/press feedback is instant (<=150ms), press scales to 0.96. Respect reduced motion.
