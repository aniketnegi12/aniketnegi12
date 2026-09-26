// ⏳ Countdown clock — renders a live SVG counting down to Dec 18, 2026
import { writeFileSync, mkdirSync } from "node:fs";

const TARGET = new Date("2026-12-18T19:00:00-05:00");

let diff = TARGET.getTime() - Date.now();
const past = diff <= 0;
diff = Math.max(diff, 0);

const days = Math.floor(diff / 86_400_000);
const hours = Math.floor((diff % 86_400_000) / 3_600_000);
const mins = Math.floor((diff % 3_600_000) / 60_000);
const secs = Math.floor((diff % 60_000) / 1000);
const pad = (n) => String(n).padStart(2, "0");

// Portfolio palette — aniket-portfolio-nine-brown.vercel.app
const RED = "#e8302a";
const RED_SOFT = "#ff6b61";
const GREY = "#9c968d";

const bigText = past ? "DEC 18 2026" : `${pad(days)}d : ${pad(hours)}h : ${pad(mins)}m : ${pad(secs)}s`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="196" viewBox="0 0 760 196" role="img" aria-label="Countdown to December 18, 2026">
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0908"/>
      <stop offset=".5" stop-color="#181513"/>
      <stop offset="1" stop-color="#0a0908"/>
    </linearGradient>
    <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6b61"/>
      <stop offset="1" stop-color="#c2231e"/>
    </linearGradient>
  </defs>

  <rect width="760" height="196" fill="url(#panel)"/>
  <rect x="1.5" y="1.5" width="757" height="193" rx="14" fill="none" stroke="${RED}" stroke-width="3"/>

  <text x="380" y="52" fill="url(#red)" font-family="'Segoe UI', Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="6" text-anchor="middle">COUNTDOWN</text>
  <text x="380" y="74" fill="${GREY}" font-family="'Segoe UI', Arial, sans-serif" font-size="11" letter-spacing="3" text-anchor="middle">TO · DEC 18 2026</text>

  <text x="380" y="126" fill="${RED_SOFT}" font-family="'Consolas', 'Courier New', monospace" font-size="46" font-weight="700" letter-spacing="4" text-anchor="middle">${bigText}</text>

  <text x="380" y="164" fill="${GREY}" font-family="'Segoe UI', Arial, sans-serif" font-size="10" letter-spacing="2" text-anchor="middle">UPDATES EVERY 5 MINUTES</text>

  <g fill="${RED}">
    <polygon points="380,8 384,14 380,20 376,14"/>
    <polygon points="380,176 384,182 380,188 376,182"/>
  </g>
</svg>
`;

mkdirSync("generated", { recursive: true });
writeFileSync("generated/doomsday-countdown.svg", svg);
console.log(`⏳ Countdown rendered — ${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`);
