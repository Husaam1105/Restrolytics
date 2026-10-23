import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * The hero image: kitchen order tickets hanging from a rail, from every
 * channel a restaurant takes orders on, ending in the night's close-out
 * ticket, highlighted, with IQ's note on it in ledger green.
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
  {
    channel: "Toast POS",
    number: "#1042",
    time: "6:12 PM",
    lines: [
      [2, "Lamb shawarma"],
      [1, "Fattoush"],
    ],
    total: "$46.50",
    tilt: -1.2,
  },
  {
    channel: "Uber Eats",
    number: "UE-88F2",
    time: "6:31 PM",
    lines: [
      [1, "Chicken plate"],
      [2, "Garlic fries"],
    ],
    total: "$38.40",
    tilt: 0.8,
  },
  {
    channel: "DoorDash",
    number: "DD-4471",
    time: "7:05 PM",
    lines: [
      [3, "Falafel wrap"],
      [1, "Mint lemonade"],
    ],
    total: "$41.10",
    tilt: -0.5,
  },
  {
    channel: "Catering",
    number: "Office lunch",
    time: "Tomorrow",
    lines: [[40, "Mezze boxes"]],
    total: "$880.00",
    tilt: 1.1,
  },
];

// Tickets are printed paper in both themes, so their colours are fixed
// (the light-mode paper, highlighter and ledger-green values).
const PAPER = "bg-[oklch(0.995_0.003_100)] text-[oklch(0.21_0.006_260)]";

function Clip() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1.5 left-1/2 z-10 h-5 w-9 -translate-x-1/2 rounded-[3px] bg-linear-to-b from-[oklch(0.97_0.003_260)] to-[oklch(0.76_0.008_260)] shadow-[0_1px_2px_oklch(0_0_0/0.25)]"
    />
  );
}

function OrderTicket({ ticket, index }: { ticket: Ticket; index: number }) {
  return (
    <li
      className="ticket-drop relative w-[13.5rem] shrink-0 snap-start"
      style={{ "--tilt": `${ticket.tilt}deg`, "--delay": `${120 + index * 90}ms` } as CSSProperties}
    >
      <Clip />
      <div className={cn("ticket-paper rounded-t-[3px] px-4 pt-6 pb-7 shadow-lg", PAPER)}>
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold">
            <span aria-hidden="true" className="size-2 rounded-[2px] bg-[oklch(0.47_0.095_157)]" />
            {ticket.channel}
          </span>
          <span className="opacity-60">{ticket.time}</span>
        </div>
        <p className="mt-1 font-display text-sm font-bold [font-stretch:75%]">{ticket.number}</p>
        <ul className="mt-3 space-y-1 border-t border-dashed border-current/20 pt-3 text-sm">
          {ticket.lines.map(([qty, item]) => (
            <li key={item} className="flex gap-2">
              <span className="w-6 shrink-0 text-right tabular-nums opacity-60">{qty}×</span>
              <span className="truncate">{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-figure mt-4 border-t border-dashed border-current/20 pt-3 text-right text-xl">
          {ticket.total}
        </p>
      </div>
    </li>
  );
}

function CloseOutTicket({ index }: { index: number }) {
  return (
    <li
      className="ticket-drop relative w-[17rem] shrink-0 snap-start max-sm:order-first"
      style={{ "--tilt": "0.4deg", "--delay": `${200 + index * 90}ms` } as CSSProperties}
    >
      <Clip />
      <div className="ticket-paper rounded-t-[3px] bg-[oklch(0.925_0.17_104)] px-5 pt-6 pb-7 text-[oklch(0.21_0.006_260)] shadow-lg">
        <div className="flex items-baseline justify-between text-xs font-semibold">
          <span>Tonight, so far</span>
          <span>9:48 PM</span>
        </div>
        <p className="text-figure mt-2 text-[2.6rem]">$6,020</p>
        <dl className="mt-3 grid grid-cols-2 gap-y-1.5 border-t border-dashed border-current/25 pt-3 text-sm">
          <dt>Orders</dt>
          <dd className="text-right font-semibold tabular-nums">142</dd>
          <dt>Labor</dt>
          <dd className="text-right font-semibold tabular-nums">18.4%</dd>
          <dt>Low stock</dt>
          <dd className="text-right font-semibold tabular-nums">3 items</dd>
        </dl>
        <p className="mt-4 rounded-md bg-[oklch(0.47_0.095_157)] px-3 py-2.5 text-sm leading-snug text-white">
          <span className="font-semibold">IQ:</span> Garlic fries were 86'd on Uber Eats from 8:40.
          Add a case to Friday's order.
        </p>
      </div>
    </li>
  );
}

export function TicketRail({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* the stainless rail */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2.5 rounded-full bg-linear-to-b from-[oklch(0.99_0.002_260)] via-[oklch(0.88_0.005_260)] to-[oklch(0.72_0.008_260)] shadow-[0_2px_3px_oklch(0_0_0/0.12)]"
      />
      <ol
        aria-label="Example orders from one evening"
        // Scrolls sideways on small screens, so keyboard users need to reach it.
        tabIndex={0}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-2 pb-10 rounded-sm [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {TICKETS.map((ticket, i) => (
          <OrderTicket key={ticket.number} ticket={ticket} index={i} />
        ))}
        <CloseOutTicket index={TICKETS.length} />
      </ol>
    </div>
  );
}
