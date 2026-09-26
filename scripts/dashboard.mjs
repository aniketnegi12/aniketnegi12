// 📊 Developer Dashboard — renders assets/dashboard data from live APIs.
// Sources: official LeetCode GraphQL API (live) + GitHub public API (no tokens needed).
// Fallback: leetcode-stats-api.vercel.app only if the official API is unreachable.
// Output: generated/dashboard.svg (published to the output branch by the workflow)
const LC_USER = "aniket_negi";
const GH_USER = "Aniketnegi12";
const MILESTONE = 500; // problem-solving milestone

// Portfolio palette — aniket-portfolio-nine-brown.vercel.app
const RED = "#e8302a";
const RED_SOFT = "#ff6b61";
const GREEN = "#3ecf6b";
const GREY = "#9c968d";
const WHITE = "#f2efe9";
const TRACK = "#24211e";
const HARD = "#ffb3ae";
const MONO = "'Consolas','Courier New',monospace";
const SANS = "'Segoe UI', Arial, sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const rel = (ts) => {
  const t = typeof ts === "number" ? ts : Date.parse(ts) / 1000;
  if (!Number.isFinite(t)) return "";
  const d = Math.max(0, Date.now() / 1000 - t);
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

async function getJSON(url, timeoutMs = 10000, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      ...init,
      headers: { "User-Agent": "Mozilla/5.0 (profile-dashboard)", "Referer": "https://leetcode.com", ...(init.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Official LeetCode GraphQL — live data (the third-party stats API caches for hours).
const YEAR = new Date().getUTCFullYear();
async function fetchLeetCodeOfficial() {
  const query = `
    query($u:String!,$y:Int!,$py:Int!) {
      matchedUser(username:$u) {
        submitStats:submitStatsGlobal { acSubmissionNum { difficulty count } }
        profile { ranking }
        cal:userCalendar(year:$y) { streak totalActiveDays submissionCalendar }
        calPrev:userCalendar(year:$py) { submissionCalendar }
      }
      recentAcSubmissionList(username:$u, limit:20) { title titleSlug timestamp }
    }`;
  const data = await getJSON("https://leetcode.com/graphql", 12000, {
    method: "POST",
    body: JSON.stringify({ query, variables: { u: LC_USER, y: YEAR, py: YEAR - 1 } }),
    headers: { "Content-Type": "application/json" },
  });
  const mu = data?.data?.matchedUser;
  if (!mu) throw new Error("leetcode: no matchedUser");
  const counts = {};
  for (const s of mu.submitStats?.acSubmissionNum ?? []) counts[s.difficulty] = s.count;
  // merge this year's calendar over last year's so 12-week windows crossing Jan 1 stay correct
  const submissionCalendar = {
    ...JSON.parse(mu.calPrev?.submissionCalendar || "{}"),
    ...JSON.parse(mu.cal?.submissionCalendar || "{}"),
  };
  return {
    totalSolved: counts.All ?? 0,
    easySolved: counts.Easy ?? 0,
    mediumSolved: counts.Medium ?? 0,
    hardSolved: counts.Hard ?? 0,
    ranking: mu.profile?.ranking ?? null,
    submissionCalendar,
    recentSubmissions: (data?.data?.recentAcSubmissionList ?? []).map((s) => ({
      title: s.title,
      titleSlug: s.titleSlug,
      timestamp: Number(s.timestamp),
      statusDisplay: "Accepted", // recentAcSubmissionList is accepted-only
      lang: "cpp",
    })),
  };
}

// ---------- gather data (never throw — fall back on misses) ----------
let lc = { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, ranking: null, recentSubmissions: [], submissionCalendar: {} };
let gh = { repos: 0, followers: 0, pushes: [] };
try {
  const [lcOfficial, ghUser, ghEvents] = await Promise.all([
    fetchLeetCodeOfficial().catch(() => null),
    getJSON(`https://api.github.com/users/${GH_USER}`).catch(() => null),
    getJSON(`https://api.github.com/users/${GH_USER}/events/public?per_page=30`).catch(() => []),
  ]);
  if (lcOfficial) {
    lc = { ...lc, ...lcOfficial };
  } else {
    // fallback: cached third-party API (better than zeros if the official API hiccups)
    try { lc = { ...lc, ...(await getJSON(`https://leetcode-stats-api.vercel.app/${LC_USER}`)) }; } catch {}
  }
  if (ghUser) gh.repos = ghUser.public_repos ?? 0;
  if (ghUser) gh.followers = ghUser.followers ?? 0;
  gh.pushes = (Array.isArray(ghEvents) ? ghEvents : [])
    .filter((e) => e.type === "PushEvent")
    .filter((e) => !String(e.repo?.name ?? "").toLowerCase().endsWith(`${GH_USER.toLowerCase()}/${GH_USER.toLowerCase()}`)) // skip this profile repo
    .slice(0, 2)
    .map((e) => ({
      text: `Pushed ${e.payload?.commits?.length ?? 1} commit${(e.payload?.commits?.length ?? 1) === 1 ? "" : "s"} → ${trunc(String(e.repo?.name ?? "").split("/").pop() || "repo", 24)}`,
      ts: e.created_at,
    }));
} catch {
  // fall through with defaults so the SVG always renders
}

const solved = lc.totalSolved;
const pct = Math.min(100, Math.round((solved / MILESTONE) * 100));
const barW = 440;
const fillW = Math.round((barW * Math.min(solved, MILESTONE)) / MILESTONE);
const rank = lc.ranking ? `RANK #${Number(lc.ranking).toLocaleString("en-US")}` : "GRINDING DAILY";
const projLabel = `${gh.repos} PUBLIC REPOS`;
const latestRepo = gh.pushes[0]?.text.split("→ ")[1] ?? "cloud-bank";

const lcSolves = (lc.recentSubmissions ?? [])
  .filter((s) => s.statusDisplay === "Accepted")
  .filter((s, i, a) => a.findIndex((x) => x.titleSlug === s.titleSlug) === i) // dedupe
  .slice(0, 3)
  .map((s) => ({ text: `Solved: ${trunc(s.title, 34)} (${String(s.lang || "cpp").toUpperCase()})`, ts: s.timestamp }));

const activity = [...lcSolves, ...gh.pushes].slice(0, 5);

// ---------- 12-week submission heatmap (12 weeks x 7 days, oldest -> newest) ----------
const DAY = 86_400;
const todayUTC = Math.floor(Date.now() / 1000 / DAY) * DAY;
const cal = lc.submissionCalendar && typeof lc.submissionCalendar === "object" ? lc.submissionCalendar : {};
const heatDays = Array.from({ length: 84 }, (_, i) => {
  const ts = todayUTC - (83 - i) * DAY;
  return { count: Number(cal[String(ts)] ?? 0) };
});
const heatTotal = heatDays.reduce((s, d) => s + d.count, 0);
let bestStreak = 0;
let curStreak = 0;
for (const d of heatDays) {
  curStreak = d.count > 0 ? curStreak + 1 : 0;
  bestStreak = Math.max(bestStreak, curStreak);
}
const heatColor = (n) =>
  n <= 0 ? "#1a1815" : n <= 2 ? "#3a1712" : n <= 5 ? "#6b1d17" : n <= 9 ? "#a8271f" : n <= 15 ? "#e8302a" : "#ff6b61";
const heatCells = heatDays
  .map(
    (d, i) =>
      `<rect x="${(28 + i * 8.4).toFixed(1)}" y="476" width="7" height="8" rx="1.5" fill="${heatColor(d.count)}"${i === 83 ? ` stroke="${RED_SOFT}" stroke-width="1"` : ""}/>`
  )
  .join("\n  ");
const heatLegend = [0, 1, 3, 6, 10, 16]
  .map((n, i) => `<rect x="${78 + i * 16}" y="494" width="10" height="10" rx="2" fill="${heatColor(n)}"/>`)
  .join("");

// ---------- render ----------
const rows = activity
  .map(
    (a, i) => `
  <g font-family="${MONO}" font-size="13.5">
    <circle cx="46" cy="${286 + i * 30}" r="3.5" fill="${i % 2 === 0 ? GREEN : RED}"/>
    <text x="60" y="${290 + i * 30}" fill="${WHITE}">${esc(a.text)}</text>
    <text x="730" y="${290 + i * 30}" fill="${GREY}" font-size="11" text-anchor="end">${rel(a.ts)}</text>
  </g>`
  )
  .join("\n");

const activityBlock =
  activity.length > 0
    ? rows
    : `<text x="46" y="300" fill="${GREY}" font-family="${MONO}" font-size="13">No recent activity — go build something.</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="560" viewBox="0 0 760 560" role="img" aria-label="Developer dashboard">
  <defs>
    <linearGradient id="dPanel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0908"/>
      <stop offset=".5" stop-color="#181513"/>
      <stop offset="1" stop-color="#0a0908"/>
    </linearGradient>
    <linearGradient id="dRed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6b61"/>
      <stop offset="1" stop-color="#c2231e"/>
    </linearGradient>
    <linearGradient id="dBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e8302a"/>
      <stop offset="1" stop-color="#ff6b61"/>
    </linearGradient>
  </defs>

  <rect width="760" height="560" fill="url(#dPanel)"/>
  <rect x="1.5" y="1.5" width="757" height="557" rx="12" fill="none" stroke="${RED}" stroke-width="2.5"/>

  <!-- header -->
  <text x="30" y="36" fill="url(#dRed)" font-family="${MONO}" font-size="16" font-weight="700" letter-spacing="2">ANIKET // DEVELOPER DASHBOARD</text>
  <text x="730" y="36" fill="${GREY}" font-family="${MONO}" font-size="10" text-anchor="end">LIVE</text>
  <circle cx="748" cy="32" r="4" fill="${GREEN}">
    <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  <line x1="20" y1="50" x2="740" y2="50" stroke="${RED}" stroke-opacity=".55" stroke-width="1.5"/>

  <!-- stat columns -->
  <g font-family="${SANS}">
    <text x="46" y="80" fill="${GREY}" font-size="11" letter-spacing="3">LEETCODE</text>
    <text x="46" y="114" fill="${WHITE}" font-family="${MONO}" font-size="30" font-weight="700">${solved}</text>
    <text x="46" y="136" fill="${RED}" font-family="${MONO}" font-size="11" letter-spacing="1">${rank}</text>

    <text x="300" y="80" fill="${GREY}" font-size="11" letter-spacing="3">GITHUB</text>
    <text x="300" y="114" fill="${WHITE}" font-family="${MONO}" font-size="30" font-weight="700">${gh.followers}</text>
    <text x="300" y="136" fill="${RED}" font-family="${MONO}" font-size="11" letter-spacing="1">FOLLOWERS</text>

    <text x="520" y="80" fill="${GREY}" font-size="11" letter-spacing="3">PROJECTS</text>
    <text x="520" y="114" fill="${WHITE}" font-family="${MONO}" font-size="30" font-weight="700">${gh.repos}</text>
    <text x="520" y="136" fill="${RED}" font-family="${MONO}" font-size="11" letter-spacing="1">LATEST: ${esc(trunc(latestRepo.toUpperCase(), 14))}</text>
  </g>

  <line x1="20" y1="156" x2="740" y2="156" stroke="${RED}" stroke-opacity=".35" stroke-width="1"/>

  <!-- problem solving progress -->
  <text x="46" y="186" fill="${GREY}" font-family="${SANS}" font-size="11" letter-spacing="3">PROBLEM SOLVING</text>
  <rect x="46" y="198" width="${barW}" height="12" rx="6" fill="${TRACK}"/>
  <rect x="46" y="198" width="${fillW}" height="12" rx="6" fill="url(#dBar)">
    <animate attributeName="width" from="0" to="${fillW}" dur="1.2s" fill="freeze"/>
  </rect>
  <text x="730" y="209" fill="${RED}" font-family="${MONO}" font-size="14" font-weight="700" text-anchor="end">${solved} / ${MILESTONE} · ${pct}%</text>
  <g font-family="${MONO}" font-size="11">
    <text x="46" y="232" fill="${GREEN}">EASY ${lc.easySolved}</text>
    <text x="140" y="232" fill="${RED}">MEDIUM ${lc.mediumSolved}</text>
    <text x="250" y="232" fill="${HARD}">HARD ${lc.hardSolved}</text>
    <text x="360" y="232" fill="${GREY}">· 100% C++</text>
  </g>

  <line x1="20" y1="252" x2="740" y2="252" stroke="${RED}" stroke-opacity=".35" stroke-width="1"/>

  <!-- recent activity -->
  <text x="46" y="272" fill="${GREY}" font-family="${SANS}" font-size="11" letter-spacing="3">RECENT ACTIVITY</text>
  ${activityBlock}

  <!-- 12-week LC heatmap -->
  <text x="46" y="468" fill="${GREY}" font-family="${SANS}" font-size="11" letter-spacing="3">LC ACTIVITY · LAST 12 WEEKS</text>
  <text x="730" y="468" fill="${RED}" font-family="${MONO}" font-size="11" text-anchor="end">${heatTotal} SUBMISSIONS · ${bestStreak}D BEST STREAK</text>
  <g aria-hidden="true">
  ${heatCells}
  </g>
  <g font-family="${MONO}" font-size="10" fill="${GREY}">
    <text x="46" y="503">LESS</text>
    ${heatLegend}
    <text x="178" y="503">MORE</text>
    <text x="730" y="503" text-anchor="end">● TODAY</text>
  </g>

  <!-- footer -->
  <line x1="20" y1="524" x2="740" y2="524" stroke="${RED}" stroke-opacity=".35" stroke-width="1"/>
  <text x="380" y="542" fill="${GREY}" font-family="${MONO}" font-size="10" letter-spacing="2" text-anchor="middle">AUTO-UPDATES EVERY 5 MINUTES · LEETCODE + GITHUB APIS</text>
</svg>
`;

import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("generated", { recursive: true });
writeFileSync("generated/dashboard.svg", svg);
console.log(`📊 Dashboard rendered — ${solved} problems solved (${pct}% of ${MILESTONE}), ${gh.repos} repos, ${activity.length} activity items, heatmap ${heatTotal} subs/${bestStreak}d streak`);
