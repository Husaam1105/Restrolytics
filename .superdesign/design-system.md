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

## Visual direction ("Highlighter", chosen 2026-10-23)
A manager marking up the night's printout. Every visual idea comes from real restaurant objects: kitchen tickets on a steel rail, the close-out printout, a highlighter, green-bar ledger paper.
- Paper canvas oklch(0.979 0.004 100) (#F9F8F5), white cards.
- Ink oklch(0.21 0.006 260) (#17181B) for text and primary buttons. The UI is mostly ink on paper, so colour always means something.
- Highlighter yellow oklch(0.925 0.17 104) (#FAEB4E): only for the one thing that matters on a screen (today's figure, the active page, the close-out ticket, today's chart bar cap). Text on it is always ink.
- Ledger green oklch(0.47 0.095 157) (#216A45): annotations. Links, focus rings, IQ Copilot's notes, "due" tags, earlier-period chart bars, positive notes.
- Errors: red oklch(0.54 0.2 27) with an icon. Warning: orange-amber, kept away from the lemon yellow.
- Rejected: blue as the accent (fought the yellow), magenta, orange (Toast/7shifts), spruce/teal.
- Signature: the ticket rail hero (order tickets with torn bottom edges clipped to a stainless rail, ending in the yellow close-out ticket with IQ's note in ledger green). The dashboard's "Sales today" is the same close-out ticket.
- Type: Archivo Variable only. Headlines condensed (72-82% width), heavy, tight leading; body normal width 16px; numbers tabular.
- Dark mode: the same printout under a desk lamp. Ink canvas, paper buttons, highlighter glowing; tickets stay paper.
- Avoid: all-caps eyebrow labels, arrows appended to button text, middle-dot meta strings, gradient washes, more than one highlighted thing per view.

## Motion
One orchestrated entrance at most. Hover/press feedback is instant (<=150ms), press scales to 0.96. Respect reduced motion.
