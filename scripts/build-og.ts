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
body { width: 1200px; height: 630px; font-family: Archivo; background: oklch(0.979 0.004 100); color: oklch(0.21 0.006 260);
  display: grid; grid-template-columns: 1.2fr 1fr; gap: 56px; padding: 64px 72px; align-items: center; }
.brand { display: flex; align-items: center; gap: 14px; font-weight: 800; font-stretch: 78%; font-size: 34px; }
.brand svg { width: 52px; height: 52px; }
h1 { margin-top: 40px; font-size: 76px; line-height: .95; font-weight: 800; font-stretch: 72%; letter-spacing: -.02em; }
p { margin-top: 24px; font-size: 26px; line-height: 1.35; color: oklch(0.47 0.01 260); }
.rail { position: relative; padding-top: 6px; }
.rail::before { content: ""; position: absolute; left: -40px; right: -72px; top: 0; height: 12px; border-radius: 6px;
  background: linear-gradient(oklch(0.99 0.002 260), oklch(0.88 0.005 260) 40%, oklch(0.72 0.008 260)); }
.clip { position: absolute; top: -2px; left: 50%; width: 44px; height: 24px; margin-left: -22px; border-radius: 4px; z-index: 1;
  background: linear-gradient(oklch(0.97 0.003 260), oklch(0.76 0.008 260)); }
.ticket { background: oklch(0.925 0.17 104); padding: 34px 30px 40px; rotate: .6deg; transform-origin: top center;
  mask: linear-gradient(#000 0 0) top / 100% calc(100% - 9px) no-repeat,
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 18px 9px repeat-x; }
.meta { display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; }
.big { margin-top: 10px; font-size: 76px; font-weight: 800; font-stretch: 72%; font-variant-numeric: tabular-nums; }
.row { display: flex; justify-content: space-between; font-size: 21px; padding: 5px 0; }
.row b { font-variant-numeric: tabular-nums; }
.rows { margin-top: 12px; padding-top: 12px; border-top: 2px dashed oklch(0.21 0.006 260 / 25%); }
.iq { margin-top: 18px; background: oklch(0.47 0.095 157); color: #fff; border-radius: 8px; padding: 12px 14px; font-size: 18px; line-height: 1.35; }
</style></head><body>
<div><div class="brand">${logo}<span>Restrolytics</span></div>
<h1>The whole night, added up before you lock the door.</h1>
<p>Sales, stock, shifts and payroll for restaurants, with a copilot that knows your numbers.</p></div>
<div class="rail"><span class="clip"></span><div class="ticket">
<div class="meta"><span>Tonight, so far</span><span>9:48 PM</span></div>
<div class="big">$6,020</div>
<div class="rows"><div class="row"><span>Orders</span><b>142</b></div><div class="row"><span>Labor</span><b>18.4%</b></div><div class="row"><span>Low stock</span><b>3 items</b></div></div>
<div class="iq"><b>IQ:</b> Garlic fries were 86'd on Uber Eats from 8:40. Add a case to Friday's order.</div>
</div></div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(root, "public/og.png") });

// Apple touch icon: the mark on a highlighter-yellow square, 180x180.
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(
  `<body style="margin:0;width:180px;height:180px;display:grid;place-items:center;background:oklch(0.925 0.17 104)">` +
    logo.replace("<svg ", '<svg width="120" height="120" ') +
    `</body>`,
);
await icon.screenshot({ path: join(root, "public/apple-touch-icon.png") });
await browser.close();
console.log("Wrote public/og.png and public/apple-touch-icon.png");
