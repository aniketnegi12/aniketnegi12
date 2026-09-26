// 🔴 GitHub Contributions — scrapes the public contributions page and renders
// the last 12 months of activity as a red-on-black SVG matching the portfolio theme.
// Source: https://github.com/users/<user>/contributions (public, no token needed).
// Output: generated/contributions.svg (published to the output branch by the workflow)
const GH_USER = "Aniketnegi12";

// Portfolio palette — aniket-portfolio-nine-brown.vercel.app
const RED = "#e8302a";
const RED_SOFT = "#ff6b61";
const GREY = "#9c968d";
const WHITE = "#f2efe9";
const MONO = "'Consolas','Courier New',monospace";
const SANS = "'Segoe UI', Arial, sans-serif";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// count-based red ramp (mirrors the dashboard heatmap)
const ramp = (n) =>
  n <= 0 ? "#1a1815" : n <= 2 ? "#3a1712" : n <= 5 ? "#6b1d17" : n <= 9 ? "#a8271f" : n <= 15 ? RED : RED_SOFT;
// level-based fallback if counts can't be parsed
const levelColor = (l) => ["#1a1815", "#3a1712", "#6b1d17", RED, RED_SOFT][l] ?? "#1a1815";

async function fetchContributions() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`https://github.com/users/${GH_USER}/contributions`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (profile-contributions)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function parseCalendar(html) {
  // cells: <td ... id="contribution-day-component-0-0" ... data-date="2025-09-21" ... data-level="0" ...>
  const cells = [];
  const tdRe = /<td[^>]*>/g;
  let m;
  while ((m = tdRe.exec(html))) {
    const tag = m[0];
    const id = tag.match(/id="(contribution-day-component-\d+-\d+)"/)?.[1];
    const date = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const level = tag.match(/data-level="(\d)"/)?.[1];
    if (id && date && level !== undefined) cells.push({ id, date, level: Number(level) });
  }
  if (cells.length < 100) throw new Error("parse: too few calendar cells");

  // counts: <tool-tip ... for="contribution-day-component-0-0" ...>4 contributions on September 28th.</tool-tip>
  const counts = new Map();
  const tipRe = /<tool-tip[^>]*for="(contribution-day-component-\d+-\d+)"[^>]*>([^<]*)<\/tool-tip>/g;
  while ((m = tipRe.exec(html))) {
    const text = m[2];
    const n = /no contributions/i.test(text) ? 0 : Number(text.match(/(\d+)\s+contributions?/i)?.[1] ?? 0);
    counts.set(m[1], Number.isFinite(n) ? n : 0);
  }

  // grid position from dates (row = weekday, col = weeks since first Sunday)
  const start = new Date(`${cells[0].date}T00:00:00Z`).getTime();
  const today = new Date().toISOString().slice(0, 10);
  for (const c of cells) {
    const t0 = new Date(`${c.date}T00:00:00Z`);
    c.col = Math.floor((t0.getTime() - start) / 86_400_000 / 7);
    c.row = t0.getUTCDay();
    c.count = counts.get(c.id);
    c.future = c.date > today;
  }
  return cells;
}

// ---------- gather (never throw — render a fallback panel on failure) ----------
let cells = null;
let error = null;
try {
  cells = parseCalendar(await fetchContributions());
} catch (e) {
  error = String(e?.message || e);
}

// ---------- layout ----------
const W = 760;
const X0 = 40;
const Y0 = 66;
const CELL = 10;
const PITCH = 12.6;
const H = 240;

let grid = "";
let monthsSvg = "";
let total = 0;
let bestStreak = 0;
let curStreak = 0;
let curRun = 0;
let todayMarked = false;

if (cells) {
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const sorted = [...cells].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const c of sorted) {
    if (!c.future) {
      total += c.count ?? 0;
      curRun = (c.count ?? 0) > 0 ? curRun + 1 : 0;
      bestStreak = Math.max(bestStreak, curRun);
      if (c.date === new Date().toISOString().slice(0, 10)) {
        curStreak = curRun;
        todayMarked = true;
      }
    }
    const fill = c.future ? "#11100e" : c.count !== undefined ? ramp(c.count) : levelColor(c.level);
    const outline = c.date === new Date().toISOString().slice(0, 10) ? ` stroke="${RED_SOFT}" stroke-width="1"` : "";
    grid += `<rect x="${(X0 + c.col * PITCH).toFixed(1)}" y="${(Y0 + c.row * PITCH).toFixed(1)}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}"${outline}/>\n  `;
  }

  // month labels — mark columns where the month changes
  let prevMonth = -1;
  let lastLabelCol = -99;
  for (let col = 0; col < cols; col++) {
    const first = sorted.find((c) => c.col === col);
    if (!first) continue;
    const mo = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
    if (mo !== prevMonth && col - lastLabelCol >= 3) {
      monthsSvg += `<text x="${(X0 + col * PITCH).toFixed(1)}" y="${Y0 - 12}" fill="${GREY}" font-family="${MONO}" font-size="10">${MONTHS[mo]}</text>\n  `;
      prevMonth = mo;
      lastLabelCol = col;
    } else if (mo !== prevMonth) {
      prevMonth = mo;
    }
  }

  // weekday labels
  const dayLabel = (row, text) =>
    `<text x="${X0 - 8}" y="${(Y0 + row * PITCH + CELL - 1).toFixed(1)}" fill="${GREY}" font-family="${MONO}" font-size="9" text-anchor="end">${text}</text>`;
  var weekdaySvg = dayLabel(1, "MON") + dayLabel(3, "WED") + dayLabel(5, "FRI");
}

const stats = cells
  ? `${total} TOTAL · ${bestStreak}D BEST STREAK${curStreak > 0 ? ` · ${curStreak}D CURRENT` : ""}`
  : "SYNCING…";
const footer = cells
  ? `SCRAPED FROM GITHUB · RED = MORE CONTRIBUTIONS${todayMarked ? "" : " · ● = TODAY"}`
  : `CONTRIBUTION DATA UNAVAILABLE${error ? ` (${esc(error).slice(0, 60)})` : ""} — RETRIES NEXT RUN`;

const legend = ["#1a1815", "#3a1712", "#6b1d17", "#a8271f", RED, RED_SOFT]
  .map((c, i) => `<rect x="${(X0 + i * 16).toFixed(1)}" y="${Y0 + 7 * PITCH + 14}" width="10" height="10" rx="2" fill="${c}"/>`)
  .join("");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub contributions — last 12 months">
  <defs>
    <linearGradient id="cPanel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0908"/>
      <stop offset=".5" stop-color="#181513"/>
      <stop offset="1" stop-color="#0a0908"/>
    </linearGradient>
    <linearGradient id="cRed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6b61"/>
      <stop offset="1" stop-color="#c2231e"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#cPanel)"/>
  <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="12" fill="none" stroke="${RED}" stroke-width="2.5"/>

  <text x="30" y="34" fill="url(#cRed)" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="2">GITHUB CONTRIBUTIONS</text>
  <text x="730" y="34" fill="${RED}" font-family="${MONO}" font-size="11" text-anchor="end">${esc(stats)}</text>

  ${monthsSvg}${weekdaySvg ?? ""}
  ${grid}
  ${legend}
  <text x="${X0 - 8}" y="${Y0 + 7 * PITCH + 23}" fill="${GREY}" font-family="${MONO}" font-size="9" text-anchor="end">LESS</text>
  <text x="${(X0 + 6 * 16 + 14).toFixed(1)}" y="${Y0 + 7 * PITCH + 23}" fill="${GREY}" font-family="${MONO}" font-size="9">MORE</text>

  <line x1="20" y1="${H - 34}" x2="${W - 20}" y2="${H - 34}" stroke="${RED}" stroke-opacity=".35" stroke-width="1"/>
  <text x="${W / 2}" y="${H - 15}" fill="${GREY}" font-family="${MONO}" font-size="10" letter-spacing="2" text-anchor="middle">${esc(footer)}</text>
</svg>
`;

import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("generated", { recursive: true });
writeFileSync("generated/contributions.svg", svg);
console.log(
  cells
    ? `🔴 Contributions rendered — ${total} contributions, best ${bestStreak}d streak, ${cells.length} days`
    : `🔴 Contributions fallback panel rendered (${error})`
);
