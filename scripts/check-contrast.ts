/**
 * WCAG contrast check for the design tokens in src/styles.css.
 * Parses the oklch values in :root and .dark, converts them to sRGB and
 * fails if any text/background pair below drops under its minimum ratio.
 *
 *   npm run check:contrast
 */
import { readFileSync } from "node:fs";

type Pair = [fg: string, bg: string, min: number];

// 4.5 = body text, 3 = large text / UI components and focus indicators.
const PAIRS: Pair[] = [
  ["foreground", "background", 4.5],
  ["foreground", "surface-subtle", 4.5],
  ["card-foreground", "card", 4.5],
  ["popover-foreground", "popover", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["destructive-foreground", "destructive", 4.5],
  ["success-foreground", "success", 4.5],
  ["warning-foreground", "warning", 4.5],
  ["brand-foreground", "brand", 4.5],
  ["link", "background", 4.5],
  ["link", "card", 4.5],
  ["destructive", "card", 4.5],
  ["success", "card", 3],
  ["ring", "background", 3],
  ["ring", "card", 3],
  ["sidebar-foreground", "sidebar", 4.5],
  ["sidebar-muted-foreground", "sidebar", 4.5],
  ["sidebar-accent-foreground", "sidebar-accent", 4.5],
  ["sidebar-primary-foreground", "sidebar-primary", 4.5],
  ["chart-1", "card", 3],
  ["chart-2", "card", 3],
  ["chart-3", "card", 3],
  ["chart-4", "card", 3],
  ["chart-5", "card", 3],
  // Soft badges
  ["success", "success-soft", 4.5],
  ["destructive", "destructive-soft", 4.5],
  ["link", "brand-soft", 4.5],
];

// Pairs that only exist on dark marketing bands, checked in light mode only.
const LIGHT_ONLY: Pair[] = [
  ["highlight", "ink", 4.5],
  ["ink-foreground", "ink", 4.5],
  ["ink-muted", "ink", 4.5],
  ["warning-foreground", "warning-soft", 4.5],
];

// Dark mode swaps the warning badge to warning-coloured text.
const DARK_ONLY: Pair[] = [["warning", "warning-soft", 4.5]];

function oklchToRgb(l: number, c: number, h: number) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return lin.map((v) => Math.min(1, Math.max(0, v)));
}

const luminance = ([r, g, b]: number[]) => 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;

function contrast(x: number[], y: number[]) {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi! + 0.05) / (lo! + 0.05);
}

function parseBlock(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No ${selector} block in styles.css`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const tokens = new Map<string, number[]>();
  for (const m of body.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g)) {
    tokens.set(m[1]!, oklchToRgb(Number(m[2]), Number(m[3]), Number(m[4])));
  }
  return tokens;
}

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const light = parseBlock(css, ":root");
const dark = new Map([...light, ...parseBlock(css, ".dark")]);

let failures = 0;
for (const [mode, tokens, pairs] of [
  ["light", light, [...PAIRS, ...LIGHT_ONLY]],
  ["dark", dark, [...PAIRS, ...DARK_ONLY]],
] as const) {
  for (const [fg, bg, min] of pairs) {
    const a = tokens.get(fg);
    const b = tokens.get(bg);
    if (!a || !b) {
      console.error(`✗ ${mode}: missing token ${!a ? fg : bg}`);
      failures++;
      continue;
    }
    const ratio = contrast(a, b);
    const ok = ratio >= min;
    if (!ok) failures++;
    console.log(
      `${ok ? "✓" : "✗"} ${mode.padEnd(5)} ${fg} on ${bg}: ${ratio.toFixed(2)} (min ${min})`,
    );
  }
}

if (failures) {
  console.error(`\n${failures} contrast check(s) failed.`);
  process.exit(1);
}
console.log("\nAll contrast checks passed.");
