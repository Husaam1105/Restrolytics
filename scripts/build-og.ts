/**
 * Renders the social preview image (public/og.png, 1200x630) from HTML using
 * the installed Chrome, so it uses the real brand font and colors.
 *
 *   npm run build:og
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const font = readFileSync(
  join(root, "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2"),
).toString("base64");
const logo = readFileSync(join(root, "public/brand/restrolytics-mark.svg"), "utf8");

const html = `<!doctype html><html><head><style>
@font-face { font-family: Archivo; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: Archivo; background: oklch(0.993 0.004 350); color: oklch(0.22 0.03 340);
  display: grid; grid-template-columns: 1.15fr 1fr; gap: 48px; padding: 64px 72px; align-items: center; }
.brand { display: flex; align-items: center; gap: 14px; font-weight: 800; font-stretch: 78%; font-size: 34px; }
.brand svg { width: 52px; height: 52px; }
h1 { margin-top: 40px; font-size: 76px; line-height: .95; font-weight: 800; font-stretch: 72%; letter-spacing: -.02em; }
p { margin-top: 24px; font-size: 26px; line-height: 1.35; color: oklch(0.48 0.03 340); }
.panel { background: oklch(0.955 0.03 350); border-radius: 36px; padding: 32px; }
.card { background: #fff; border-radius: 20px; padding: 26px 28px; box-shadow: 0 0 0 1px oklch(0.22 0.03 340 / 8%), 0 18px 40px -16px oklch(0.22 0.03 340 / 22%); }
.row { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 0; border-bottom: 1px solid oklch(0.915 0.014 350); font-size: 22px; }
.row:last-child { border: 0; }
.row b { font-size: 34px; font-weight: 750; font-stretch: 75%; font-variant-numeric: tabular-nums; }
.bar { height: 12px; border-radius: 99px; background: oklch(0.55 0.21 352); margin-top: 18px; }
</style></head><body>
<div><div class="brand">${logo}<span>Restrolytics</span></div>
<h1>The whole night, added up before you lock the door.</h1>
<p>Sales, stock, shifts and payroll for restaurants, with a copilot that knows your numbers.</p></div>
<div class="panel"><div class="card">
<div class="row"><span>Net sales</span><b>$5,312</b></div>
<div class="row"><span>Labor</span><b>18.4%</b></div>
<div class="row"><span>Low stock</span><b>3 items</b></div>
<div class="bar" style="width:72%"></div><div class="bar" style="width:38%;opacity:.55"></div>
</div></div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(root, "public/og.png") });

// Apple touch icon: the mark on the brand canvas, 180x180.
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(
  `<body style="margin:0;width:180px;height:180px;display:grid;place-items:center;background:oklch(0.955 0.03 350)">` +
    logo.replace("<svg ", '<svg width="120" height="120" ') +
    `</body>`,
);
await icon.screenshot({ path: join(root, "public/apple-touch-icon.png") });
await browser.close();
console.log("Wrote public/og.png and public/apple-touch-icon.png");
