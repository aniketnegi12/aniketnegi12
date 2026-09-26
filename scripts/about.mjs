// 📄 About Me — renders the README's about.yml as a red/black terminal panel.
// Replaces GitHub's default (blue-ish) yaml syntax block with portfolio-themed colors.
// Output: generated/about.svg (published to the output branch by the workflow)

// Portfolio palette — aniket-portfolio-nine-brown.vercel.app
const RED = "#e8302a";
const RED_SOFT = "#ff6b61";
const GREY = "#9c968d";
const WHITE = "#f2efe9";
const GREEN = "#3ecf6b";
const MONO = "'Consolas','Courier New',monospace";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ROWS = [
  { k: "name", v: "Aniket Singh Negi", c: WHITE },
  { k: "role", v: "CSE Student · Builder · Problem Solver", c: WHITE },
  { k: "college", v: "Graphic Era Hill University, Dehradun", c: WHITE },
  { k: "location", v: "Dehradun, Uttarakhand, India", c: WHITE },
  { k: "stack", v: "Java, Python, Flask, Firebase, SQL", c: WHITE },
  { k: "learning", v: "Data Structures & Algorithms, cloud fundamentals", c: WHITE },
  { k: "current_project", v: "cloud-bank", c: RED_SOFT },
  { k: "status", v: "Open to internships & entry-level roles", c: GREEN },
];

const W = 760;
const X_KEY = 76;
const X_VAL = 230;
const Y0 = 84;
const STEP = 28;
const H = Y0 + ROWS.length * STEP + 32;

const rowsSvg = ROWS.map(
  (r, i) => `  <text x="${X_KEY}" y="${Y0 + i * STEP}" fill="${RED}" font-family="${MONO}" font-size="14.5">${esc(r.k)}:</text>
  <text x="${X_VAL}" y="${Y0 + i * STEP}" fill="${r.c}" font-family="${MONO}" font-size="14.5">${esc(r.v)}</text>`
).join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="About me — aniket.yml">
  <defs>
    <linearGradient id="aPanel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0908"/>
      <stop offset=".5" stop-color="#181513"/>
      <stop offset="1" stop-color="#0a0908"/>
    </linearGradient>
    <linearGradient id="aRed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6b61"/>
      <stop offset=".45" stop-color="#e8302a"/>
      <stop offset="1" stop-color="#7a1712"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#aPanel)"/>

  <!-- title bar -->
  <rect x="1.5" y="1.5" width="${W - 3}" height="34" rx="13" fill="#14110f"/>
  <circle cx="26" cy="18.5" r="6" fill="${RED}"/>
  <circle cx="48" cy="18.5" r="6" fill="${GREEN}"/>
  <circle cx="70" cy="18.5" r="6" fill="#2a2724"/>
  <text x="${W / 2}" y="23" fill="${GREY}" font-family="${MONO}" font-size="13" text-anchor="middle">aniket@portfolio: ~/about.yml</text>
  <line x1="1.5" y1="35.5" x2="${W - 1.5}" y2="35.5" stroke="url(#aRed)" stroke-width="1.5"/>

  <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="14" fill="none" stroke="url(#aRed)" stroke-width="2.5"/>

${rowsSvg}

  <text x="${W - 28}" y="${H - 16}" fill="${GREY}" font-family="${MONO}" font-size="10" letter-spacing="2" text-anchor="end">YML · UTF-8 · LF</text>
  <polygon points="${W / 2},${H - 22} ${W / 2 + 5},${H - 16} ${W / 2},${H - 10} ${W / 2 - 5},${H - 16}" fill="${RED}"/>
</svg>
`;

import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("generated", { recursive: true });
writeFileSync("generated/about.svg", svg);
console.log(`📄 About panel rendered — ${ROWS.length} fields`);
