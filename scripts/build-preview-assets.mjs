// Rebuilds preview.html:
//  1. embeds every local SVG as a base64 data URI in the ASSETS map
//  2. syncs the inline markdown copy from README.md
// Run after editing any asset or README:  node scripts/build-preview-assets.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const FILES = [
  "assets/doom-banner.svg",
  "assets/doom-mask.svg",
  "assets/doom-divider.svg",
  "assets/doom-terminal.svg",
  "assets/doom-tech.svg",
  "assets/doom-projects.svg",
  "generated/doomsday-countdown.svg",
];

const MAP_START = "<!-- ASSET-MAP-START -->";
const MAP_END = "<!-- ASSET-MAP-END -->";
const MD_START = "<!-- MD-START -->";
const MD_END = "<!-- MD-END -->";

const entries = FILES.filter(existsSync).map((f) => {
  const uri = `data:image/svg+xml;base64,${Buffer.from(readFileSync(f)).toString("base64")}`;
  return `  "${f}": "${uri}",`;
});
// alias so the README's raw/output countdown URL also resolves locally pre-push
const cdn = FILES.filter(existsSync).includes("generated/doomsday-countdown.svg");
if (cdn) {
  const uri = `data:image/svg+xml;base64,${Buffer.from(readFileSync("generated/doomsday-countdown.svg")).toString("base64")}`;
  entries.push(`  "output/doomsday-countdown.svg": "${uri}",`);
}

const mapBlock = `${MAP_START}\nconst ASSETS = {\n${entries.join("\n")}\n};\n${MAP_END}`;

let html = readFileSync("preview.html", "utf8");

if (html.includes(MAP_START)) {
  html = html.replace(new RegExp(`${MAP_START}[\\s\\S]*?${MAP_END}`), mapBlock);
} else {
  html = html.replace("<script src=", `${mapBlock}\n<script src=`);
}

if (existsSync("README.md") && html.includes(MD_START) && html.includes(MD_END)) {
  const md = readFileSync("README.md", "utf8");
  html = html.replace(new RegExp(`${MD_START}[\\s\\S]*?${MD_END}`), `${MD_START}\n${md}\n${MD_END}`);
}

writeFileSync("preview.html", html);
console.log(`🔮 Embedded ${entries.length} asset(s) and synced README copy into preview.html`);
