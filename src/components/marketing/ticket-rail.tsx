import { cn } from "@/lib/utils";

/**
 * The hero image: kitchen order tickets hanging from a rail, from every
 * channel a restaurant takes orders on, ending in the night's close-out.
 * Example data, labelled as such on the page.
 */
type Ticket = {
  channel: string;
  number: string;
  time: string;
  lines: [qty: number, item: string][];
  total: string;
  tilt: number;
};

const TICKETS: Ticket[] = [
  { channel: "Toast POS", number: "#1042", time: "6:12 PM", lines: [[2, "Lamb shawarma"], [1, "Fattoush"]], total: "$46.50", tilt: -1.2 },
  { channel: "Uber Eats", number: "UE-88F2", time: "6:31 PM", lines: [[1, "Chicken plate"], [2, "Garlic fries"]], total: "$38.40", tilt: 0.8 },
  { channel: "DoorDash", number: "DD-4471", time: "7:05 PM", lines: [[3, "Falafel wrap"], [1, "Mint lemonade"]], total: "$41.10", tilt: -0.5 },
  { channel: "Catering", number: "Office lunch", time: "Tomorrow", lines: [[40, "Mezze boxes"]], total: "$880.00", tilt: 1.1 },
];

function OrderTicket({ ticket, index }: { ticket: Ticket; index: number }) {
  return (
    <li
      className="ticket-drop relative w-[13.5rem] shrink-0 snap-start"
      style={{ "--tilt": `${ticket.tilt}deg`, "--delay": `${120 + index * 90}ms` } as React.CSSProperties}
    >
      {/* clip */}
      <span aria-hidden="true" className="absolute -top-3 left-1/2 h-5 w-8 -translate-x-1/2 rounded-sm bg-ink-muted/80" />
      {/* Tickets are printed paper in both themes. */}
      <div className="ticket-paper rounded-t-md bg-[oklch(0.99_0.005_80)] px-4 pt-5 pb-6 text-ink shadow-[var(--shadow-lg)]">
        <div className="flex items-baseline justify-between gap-2 text-xs text-ink/60">
          <span className="font-semibold text-ink">{ticket.channel}</span>
          <span>{ticket.time}</span>
        </div>
        <p className="mt-1 font-display text-sm font-bold [font-stretch:75%]">{ticket.number}</p>
        <ul className="mt-3 space-y-1 border-t border-dashed border-ink/20 pt-3 text-sm">
          {ticket.lines.map(([qty, item]) => (
            <li key={item} className="flex gap-2">
              <span className="w-6 shrink-0 text-right text-ink/60 tabular-nums">{qty}×</span>
              <span className="truncate">{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-dashed border-ink/20 pt-3 text-right text-figure text-xl">{ticket.total}</p>
      </div>
    </li>
  );
}

function CloseOutTicket({ index }: { index: number }) {
  return (
    <li
      className="ticket-drop relative w-[17rem] shrink-0 snap-start"
      style={{ "--tilt": "0deg", "--delay": `${200 + index * 90}ms` } as React.CSSProperties}
    >
      <span aria-hidden="true" className="absolute -top-3 left-1/2 h-5 w-8 -translate-x-1/2 rounded-sm bg-highlight" />
      <div className="ticket-paper rounded-t-md bg-highlight px-5 pt-5 pb-6 text-ink shadow-[var(--shadow-lg)]">
        <div className="flex items-baseline justify-between text-xs font-semibold">
          <span>Tonight, so far</span>
          <span>9:48 PM</span>
        </div>
        <p className="mt-2 text-figure text-[2.6rem]">$6,020</p>
        <dl className="mt-3 grid grid-cols-2 gap-y-1.5 border-t border-dashed border-ink/25 pt-3 text-sm">
          <dt>Orders</dt>
          <dd className="text-right font-semibold tabular-nums">142</dd>
          <dt>Labor</dt>
          <dd className="text-right font-semibold tabular-nums">18.4%</dd>
          <dt>Low stock</dt>
          <dd className="text-right font-semibold tabular-nums">3 items</dd>
        </dl>
        <p className="mt-4 rounded-md bg-ink px-3 py-2.5 text-sm leading-snug text-ink-foreground">
          <span className="font-semibold text-highlight">IQ:</span> Garlic fries were 86'd on Uber Eats from 8:40. Add a case
          to Friday's order.
        </p>
      </div>
    </li>
  );
}

export function TicketRail({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* the rail itself */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 rounded-full bg-gradient-to-b from-ink-muted/70 to-ink-muted/30" />
      <ol
        aria-label="Example orders from one evening"
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-3 pb-8 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {TICKETS.map((ticket, i) => (
          <OrderTicket key={ticket.number} ticket={ticket} index={i} />
        ))}
        <CloseOutTicket index={TICKETS.length} />
      </ol>
    </div>
  );
}
