/**
 * LinkedIn attendee spotlights for the Motiv Brands Invitational.
 *
 * Reads a CSV of confirmed attendees and writes two things:
 *
 *   out/cards.html     one 1200x1200 card per attendee, LinkedIn's square size
 *   out/captions.md    the post copy for each, ready to paste
 *
 * The card and the caption come from the same row, so a spotlight is one line
 * in a spreadsheet rather than a design job. Captions rotate through three
 * shapes so a run of posts does not read as a mail merge.
 *
 * Run:  node invitational-spotlight/build-spotlights.js [attendees.csv]
 *
 * Cards are HTML rather than images because the brand fonts are web fonts and
 * a browser is the only thing that renders them correctly. Open cards.html to
 * review; to publish, screenshot each .card element at 1200x1200 (any browser
 * devtools will do, or ask Claude to render them with Playwright).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { THEMES, THEME_KEYS, ALL_THEME_CSS } = require("./themes");

/** --theme=<key> picks the look. out/designs.html shows them all together. */
const THEME = (process.argv.find((a) => a.startsWith("--theme=")) || "").split("=")[1] || "navy";
if (!THEME_KEYS.includes(THEME)) {
  throw new Error(`unknown theme "${THEME}". One of: ${THEME_KEYS.join(", ")}`);
}

// ---------------------------------------------------------------------------
// The event. Every fact below is taken from the Invitational site; change it
// here and both the cards and the captions follow.
// ---------------------------------------------------------------------------
const EVENT = {
  name: "The 1st Annual Motiv Brands Invitational",
  shortName: "Motiv Brands Invitational",
  date: "Wednesday, January 27, 2027",
  dateShort: "27 January 2027",
  format: "12:00 PM Modified Shotgun",
  venue: "Bali Hai Golf Club",
  city: "Las Vegas",
  fieldSize: 72,
  prizes: 27,
  presenters: ["Lead Generation World", "Troutman Amin, LLP", "Standard Information"],
  url: "https://invitational.motivbrands.co",   // verified live 3 Nov 2026
  hashtags: ["#MotivBrandsInvitational", "#BaliHai", "#LasVegas", "#LeadGeneration"]
};

const BRAND = {
  ink: "#051d34", inkSoft: "#0a2b4a",
  gold: "#bd9146", goldLight: "#e7c77f",
  blue: "#188ee8", blueLight: "#81c8f7",
  paper: "#fdfefe", muted: "#95a4b1"
};

// ---------------------------------------------------------------------------
// CSV. Small enough to parse here: titles and company names contain commas,
// so quoted fields have to work, but nothing beyond that is needed.
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift().map(h => h.trim().toLowerCase());
  return rows
    .filter(r => r.some(v => v.trim()))
    .map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] || "").trim()])));
}

const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Company names as people type them into a form — "Affiliated media", "The
 * platinum collection LLC" — look careless on a card. Title-case them, but
 * leave suffixes and acronyms alone and keep the small joining words down
 * unless they lead.
 */
// Always uppercase: unambiguous legal suffixes, which are never ordinary words.
const SUFFIXES = new Set(["LLC", "LLP", "INC", "LTD", "LP", "PLLC", "PC", "CORP"]);
// Uppercase only when the person already typed them that way — "IT" and "US"
// are also ordinary words, and "co" is Co. rather than Colorado.
const ACRONYMS = new Set(["USA", "US", "UK", "AI", "IT", "HR", "CRM", "SEO", "PPC", "DME",
  "LGW", "TV", "DTC", "B2B", "B2C", "RX"]);
const KEEP_LOWER = new Set(["of", "and", "the", "for", "a", "an", "at", "by", "in", "on", "to", "or"]);

function tidyCompany(raw) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.split(" ").map((w, i) => {
    const bare = w.replace(/[^A-Za-z]/g, "");
    if (!bare) return w;                                   // "&", "-"
    if (SUFFIXES.has(bare.toUpperCase())) return w.toUpperCase();
    if (bare === bare.toUpperCase() && ACRONYMS.has(bare.toUpperCase())) return w;
    if (/[a-z][A-Z]/.test(w)) return w;                    // iHeart, McKinsey — deliberate
    if (i > 0 && KEEP_LOWER.has(bare.toLowerCase())) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

const isPartner = (a) => /partner|sponsor|presenting/i.test(a.role || "");

/**
 * GHL exports its own column names, so a raw export works as input without
 * being reshaped by hand first. A sheet already in this tool's own columns
 * passes straight through.
 */
function normalise(rows) {
  if (!rows.length || !("first name" in rows[0] || "organization" in rows[0])) return rows;
  return rows.map((r) => ({
    name: [r["first name"], r["last name"]].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    // The registration form has no job title field, so this is normally blank
    // and the card simply omits the line. Add the column to the sheet (or the
    // field to the form) and it fills itself in.
    title: r["title"] || r["job title"] || "",
    company: tidyCompany(r["organization"] || r["company"]),
    linkedin: r["linkedin"] || "",
    role: r["role"] || "",
    quote: r["quote"] || "",
    registered: r["submission date"] || "",
    "may feature": r["may feature"] || r["may_feature"] || ""
  }));
}

/**
 * --cleared-all treats every row as having permission.
 *
 * It exists because permission is often recorded somewhere other than this
 * sheet. It is a statement that the permission exists, not a way around
 * needing it — the registration form's two tick boxes cover texts and
 * marketing only, and the registration Terms contain no publicity or likeness
 * clause, so neither of those is the permission.
 */
const CLEARED_ALL = process.argv.includes("--cleared-all");

/**
 * The publicity gate.
 *
 * Registering says nothing about being named in a public post — the only
 * consents the form collects are for texts and marketing. Until someone
 * records a yes, the card carries a banner and the caption is marked, so a
 * spotlight cannot be posted by accident on permission nobody gave.
 */
const cleared = (a) => CLEARED_ALL || /^(y|yes|true|1)$/i.test(String(a["may feature"] || "").trim());

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------
function card(a, theme = THEME, idPrefix = "card-") {
  const eyebrow = isPartner(a) ? "Presenting partner" : "Joining the field";
  const quote = a.quote
    ? `<p class="quote">&ldquo;${esc(a.quote)}&rdquo;</p>`
    : "";

  return `
<figure class="card card--${theme}${cleared(a) ? "" : " card--blocked"}" id="${idPrefix}${slug(a.name)}" data-name="${esc(a.name)}" data-theme="${theme}">
  <span class="glow" aria-hidden="true"></span>
  <span class="grain" aria-hidden="true"></span>
  <span class="numeral" aria-hidden="true">27</span>
  <span class="frame" aria-hidden="true"></span>
  ${cleared(a) ? "" : `<div class="blocked">Draft &mdash; publicity consent not confirmed</div>`}

  <header class="card-top">
    <span class="kicker">${esc(EVENT.shortName)}</span>
    <img class="mark" src="brand-mark.png" alt="">
  </header>

  <div class="card-body">
    <span class="eyebrow">${eyebrow}</span>
    <h2 class="name">${esc(a.name)}</h2>
    <span class="dash" aria-hidden="true"></span>
    ${a.title ? `<p class="title">${esc(a.title)}</p>` : ""}
    ${a.company ? `<p class="company">${esc(a.company)}</p>` : ""}
    ${quote}
  </div>

  <footer class="card-foot">
    <div class="rule"></div>
    <div class="foot-row">
      <div>
        <p class="when">${esc(EVENT.dateShort)}</p>
        <p class="where">${esc(EVENT.venue)} &middot; ${esc(EVENT.city)}</p>
      </div>
      <span class="badge">${EVENT.fieldSize}-Player Field</span>
    </div>
  </footer>
</figure>`;
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Manrope:wght@600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&display=swap');

  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px; background: #dfe6ec;
    font-family: 'DM Sans', system-ui, sans-serif; display: flex;
    flex-wrap: wrap; gap: 40px; justify-content: center; }

  /* 1200x1200 is LinkedIn's square post. Screenshot each .card at this size.
     flex: 0 0 auto matters — as a flex item the card shrinks below 1200px
     otherwise, and every export comes out the wrong aspect ratio. */
  .card { position: relative; flex: 0 0 auto; width: 1200px; height: 1200px; margin: 0;
    padding: 96px 96px 88px; display: flex; flex-direction: column; overflow: hidden;
    isolation: isolate; color: #F4F8FB;
    background:
      linear-gradient(168deg, #082741 0%, #04172a 46%, #020d1a 100%); }

  /* Depth, in three layers: two coloured glows, a paper grain, and a vignette.
     Flat navy reads as a slide; this reads as print. */
  .glow { position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(52% 44% at 88% 6%, rgba(32,142,232,.30) 0%, transparent 70%),
      radial-gradient(46% 42% at 4% 98%, rgba(189,145,70,.26) 0%, transparent 72%),
      radial-gradient(120% 100% at 50% 50%, transparent 46%, rgba(1,7,15,.62) 100%); }

  .grain { position: absolute; inset: 0; z-index: 1; pointer-events: none;
    opacity: .085; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 220px 220px; }

  /* The 27 of 27 January, and of the 27 prizes. Outlined rather than filled so
     it reads as a watermark instead of competing with the name. */
  .numeral { position: absolute; z-index: 1; right: -54px; top: 50%;
    transform: translateY(-52%); pointer-events: none;
    font-family: 'Playfair Display', serif; font-weight: 900; font-size: 660px;
    line-height: .78; letter-spacing: -24px; color: transparent;
    -webkit-text-stroke: 2px rgba(231,199,127,.085); }

  /* A hairline frame, with one gold tick at the top-left and one at the
     bottom-right — asymmetry reads as designed, four corners reads as a border. */
  .frame { position: absolute; z-index: 2; inset: 40px; pointer-events: none;
    border: 1px solid rgba(231,199,127,.20); }
  .frame::before, .frame::after { content: ""; position: absolute; width: 56px; height: 56px; }
  .frame::before { top: -1px; left: -1px;
    border-top: 2px solid rgba(231,199,127,.85); border-left: 2px solid rgba(231,199,127,.85); }
  .frame::after { bottom: -1px; right: -1px;
    border-bottom: 2px solid rgba(231,199,127,.85); border-right: 2px solid rgba(231,199,127,.85); }

  .card-top, .card-body, .card-foot { position: relative; z-index: 3; }

  .card-top { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
  .kicker { font-family: 'Manrope', sans-serif; font-size: 19px; font-weight: 800;
    letter-spacing: 5.4px; text-transform: uppercase;
    background: linear-gradient(92deg, #f2d998 0%, #bd9146 52%, #f2d998 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .mark { width: 74px; height: 74px; object-fit: contain; opacity: .94; }

  /* Content sits a little below optical centre: the eye reads a poster as
     bottom-weighted, and it leaves the numeral room to breathe. */
  .card-body { flex: 1; display: flex; flex-direction: column; justify-content: center;
    padding-top: 54px; max-width: 880px; }

  .eyebrow { font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 700;
    letter-spacing: 4.2px; text-transform: uppercase; color: #8fcdf5; }

  .name { margin: 26px 0 0; font-family: 'Playfair Display', serif; font-size: 108px;
    line-height: .98; font-weight: 700; letter-spacing: -3px; text-wrap: balance;
    text-shadow: 0 2px 30px rgba(0,0,0,.32); }

  .dash { display: block; width: 140px; height: 3px; margin: 34px 0 0;
    background: linear-gradient(90deg, #f2d998 0%, #bd9146 70%, rgba(189,145,70,0) 100%); }

  .title { margin: 30px 0 0; font-size: 32px; line-height: 1.32; color: #c6d4de; }
  .company { margin: 30px 0 0; font-family: 'Manrope', sans-serif; font-size: 42px;
    font-weight: 700; letter-spacing: -.6px; line-height: 1.18; color: #9ad5fb; }
  .title + .company { margin-top: 10px; font-size: 32px; }

  .quote { margin: 34px 0 0; padding-left: 30px; border-left: 3px solid rgba(189,145,70,.8);
    font-family: 'Playfair Display', serif; font-style: italic; font-size: 35px;
    line-height: 1.42; color: #e6eef5; }

  .rule { height: 1px; background: linear-gradient(90deg, rgba(231,199,127,.75), rgba(231,199,127,0)); }
  .foot-row { display: flex; align-items: center; justify-content: space-between;
    gap: 24px; padding-top: 30px; }
  .when { margin: 0; font-family: 'Manrope', sans-serif; font-size: 32px;
    font-weight: 800; letter-spacing: -.2px; }
  .where { margin: 8px 0 0; font-size: 24px; color: #8d9eac; }
  .badge { padding: 13px 26px; border: 1px solid rgba(231,199,127,.42); border-radius: 999px;
    font-family: 'Manrope', sans-serif; font-size: 17px; font-weight: 800;
    letter-spacing: 2.8px; text-transform: uppercase; color: #e7c77f; white-space: nowrap; }

  /* Deliberately unmissable: a card in this state must not be posted. The
     banner disappears the moment the sheet records a yes in may_feature. */
  .blocked { position: absolute; top: 0; left: 0; right: 0; z-index: 9;
    padding: 15px; background: #8C1D18; color: #fff; text-align: center;
    font-family: 'Manrope', sans-serif; font-size: 19px; font-weight: 800;
    letter-spacing: 2.6px; text-transform: uppercase; }
  .card--blocked { padding-top: 130px; }
`;

// ---------------------------------------------------------------------------
// The captions. Three shapes, rotated, so a week of posts does not look
// generated. A row with a quote always uses the quote shape.
// ---------------------------------------------------------------------------
const PRESENTERS = EVENT.presenters.slice(0, -1).join(", ") + " and " + EVENT.presenters.slice(-1);
const TAGS = EVENT.hashtags.join(" ");
const who = (a) => [a.title, a.company].filter(Boolean).join(", ");

/**
 * The person as they read inside a sentence. Three shapes, because the
 * punctuation differs: a title needs commas around the clause, a bare company
 * reads better with "of" and no commas at all.
 *
 *   "Jordan Avery, VP of Partnerships at Example Media Group,"
 *   "Jordan Avery, VP of Partnerships,"
 *   "Joe Ruiz of Monetized Clicks"
 */
function nameAndRole(a) {
  if (a.title && a.company) return `${a.name}, ${a.title} at ${a.company},`;
  if (a.title) return `${a.name}, ${a.title},`;
  if (a.company) return `${a.name} of ${a.company}`;
  return a.name;
}

function captions(a) {
  const name = a.name;
  const line = who(a);
  const subject = nameAndRole(a);

  const welcome = `Pleased to welcome ${subject} to the field for ${EVENT.name}.

${EVENT.dateShort} · ${EVENT.venue} · ${EVENT.city}

${EVENT.fieldSize} players. ${EVENT.prizes} planned prizes. One afternoon that finishes with the official Motiv Brands launch celebration.

Presented by ${PRESENTERS}.

The field is invitation-only and limited to ${EVENT.fieldSize}. Request an invitation: ${EVENT.url}

${TAGS}`;

  const field = `The field is taking shape.

${name}${line ? ` (${line})` : ""} will be at ${EVENT.venue} on ${EVENT.dateShort} for ${EVENT.name}.

An invitation-only ${EVENT.fieldSize}-player day built around the conversations that are hard to have anywhere else — championship golf, ${EVENT.prizes} planned prizes, and the official Motiv Brands launch celebration to close it out.

Presented by ${PRESENTERS}.

Request an invitation: ${EVENT.url}

${TAGS}`;

  const quoted = a.quote ? `"${a.quote}"

— ${name}${line ? `, ${line}` : ""}, joining us at ${EVENT.name}.

${EVENT.dateShort} · ${EVENT.venue} · ${EVENT.city}
${EVENT.fieldSize} players, ${EVENT.prizes} planned prizes, and the official Motiv Brands launch celebration.

Presented by ${PRESENTERS}.

Request an invitation: ${EVENT.url}

${TAGS}` : null;

  const partner = `Presenting partner spotlight.

${subject} helps bring ${EVENT.name} to ${EVENT.venue} on ${EVENT.dateShort}.

${EVENT.fieldSize} players, ${EVENT.prizes} planned prizes, and the official Motiv Brands launch celebration, in one afternoon on the Las Vegas Strip.

Request an invitation: ${EVENT.url}

${TAGS}`;

  if (isPartner(a)) return { primary: partner, alternates: [welcome] };
  if (quoted) return { primary: quoted, alternates: [welcome, field] };
  return { primary: null, alternates: [welcome, field] };
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
// This folder sits inside the Invitational site, which Vercel serves whole,
// and data/ holds a real export — names, emails, phone numbers, IP addresses.
// Two things keep it off the public domain, and both must stay in place:
//
//   .vercelignore        "spotlight/" — the folder is not uploaded at all
//   vercel.json          /spotlight/* is redirected, so even if a file did
//                        get uploaded the URL does not serve it
//
// If either is removed, the export becomes downloadable by anyone who guesses
// the path. Check both before deploying.
const ROOT_SITE = path.join(__dirname, "..");
const DATA = path.join(__dirname, "data");

const input = process.argv.slice(2).find((a) => !a.startsWith("--")) ||
  path.join(DATA, "submission from invite request.csv");
const outDir = path.join(__dirname, "out");
fs.mkdirSync(outDir, { recursive: true });

const attendees = normalise(parseCsv(fs.readFileSync(input, "utf8")));
if (!attendees.length) throw new Error(`${input}: no rows`);

// Longest-standing registrant announced first. GHL exports newest-first, and
// the people who signed up earliest have waited longest to be acknowledged.
const when = (a) => { const t = Date.parse(String(a.registered || "").replace(/(\d+)(st|nd|rd|th)/, "$1")); return isNaN(t) ? Infinity : t; };
attendees.sort((x, y) => when(x) - when(y));

/**
 * The run order. Keith's cadence: the current backlog goes out two a day,
 * then new registrations are posted as they arrive.
 */
const PER_DAY = 2;
function schedule(list) {
  const slots = ["morning", "afternoon"];
  return list.map((a, i) => ({
    who: a.name,
    day: Math.floor(i / PER_DAY) + 1,
    slot: slots[i % PER_DAY] || `post ${(i % PER_DAY) + 1}`
  }));
}

// The cards reference the mark locally so out/ is self-contained and can be
// zipped or handed to someone without the site around it.
fs.copyFileSync(path.join(ROOT_SITE, "assets", "brand-mark.png"), path.join(outDir, "brand-mark.png"));

fs.writeFileSync(path.join(outDir, "cards.html"), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invitational Spotlight Cards</title>
<style>${STYLES}
${ALL_THEME_CSS}</style>
</head>
<body>
${attendees.map((a) => card(a)).join("\n")}
</body>
</html>
`, "utf8");

// ---------------------------------------------------------------------------
// out/designs.html — every theme on the same person, so they can be compared
// on like for like rather than from a description.
// ---------------------------------------------------------------------------
const sample = attendees.find((a) => a.company && a.name.split(" ").length === 2) || attendees[0];
fs.writeFileSync(path.join(outDir, "designs.html"), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spotlight card designs</title>
<style>${STYLES}
${ALL_THEME_CSS}
  body { display: block; padding: 48px; background: #cfd8e0; }
  .opt { max-width: 1200px; margin: 0 auto 64px; }
  /* Direct children only: the card's own name is an h2 and its company a p,
     so an unscoped .opt h2 wins on specificity and flattens every card. */
  .opt > h2 { margin: 0 0 4px; font-family: 'Manrope', sans-serif; font-size: 23px;
    font-weight: 800; color: #0f1a24; letter-spacing: -.3px; }
  .opt > p { margin: 0 0 18px; font-size: 16px; color: #4b5a66; }
  .opt > p code { font-size: 14px; color: #0c6256; }
</style>
</head>
<body>
${THEME_KEYS.map((k) => `<section class="opt">
  <h2>${esc(THEMES[k].label)}</h2>
  <p>${esc(THEMES[k].note)} &nbsp;<code>--theme=${k}</code></p>
  ${card(sample, k, `design-${k}-`)}
</section>`).join("\n")}
</body>
</html>
`, "utf8");

const md = attendees.map((a) => {
  const c = captions(a);
  const all = [c.primary, ...c.alternates].filter(Boolean);
  return `## ${a.name}${who(a) ? ` — ${who(a)}` : ""}\n\n` +
    (cleared(a)
      ? ""
      : `> **Not cleared to publish.** No record that ${a.name.split(" ")[0]} has agreed to be named publicly.\n` +
        `> Put \`yes\` in the \`may_feature\` column once they have, and re-run.\n\n`) +
    `Card: \`out/cards.html\` → \`#card-${slug(a.name)}\`\n` +
    (a.title ? "" : `No job title on file — the card omits that line.\n`) +
    (a.linkedin ? `Tag: ${a.linkedin}\n` : "") +
    `\n` +
    all.map((t, i) => `### Option ${i + 1}\n\n${t}\n`).join("\n") +
    `\n---\n`;
}).join("\n");

const plan = schedule(attendees);
const planTable =
  `| Day | Slot | Who | Ready |\n|---|---|---|---|\n` +
  plan.map((p, i) => `| ${p.day} | ${p.slot} | ${p.who} | ${cleared(attendees[i]) ? "yes" : "**blocked**"} |`).join("\n");

fs.writeFileSync(path.join(outDir, "captions.md"),
  `# Invitational spotlight captions\n\n` +
  `Generated from \`${path.basename(input)}\` — ${attendees.length} attendee(s).\n` +
  `Edit the CSV and re-run; do not hand-edit this file.\n\n` +
  `Posted from the **Motiv Brands** company page.\n\n` +
  `## Running order\n\n` +
  `${PER_DAY} a day until the backlog is out, oldest registration first, then\n` +
  `new registrations as they arrive.\n\n${planTable}\n\n` +
  (attendees.every(cleared)
    ? ``
    : `**Blocked rows must not be posted.** Registering is not permission to be named\n` +
      `publicly: the form's tick boxes cover texts and marketing, and the registration\n` +
      `Terms contain no publicity or likeness clause. Put \`yes\` in \`may_feature\` per\n` +
      `person, or run with \`--cleared-all\` if permission is recorded elsewhere.\n\n`) +
  `---\n\n` + md,
  "utf8");

const okCount = attendees.filter(cleared).length;
console.log(`${attendees.length} spotlight(s), ${okCount} cleared to publish:`);
for (const a of attendees) {
  console.log(`  ${cleared(a) ? "ok     " : "BLOCKED"} ${a.name}${who(a) ? ` — ${who(a)}` : ""}` +
    `${isPartner(a) ? "  [partner]" : ""}${a.title ? "" : "  (no title)"}`);
}
console.log(`\n  out/cards.html     ${attendees.length} card(s), 1200x1200`);
console.log(`  out/designs.html   ${THEME_KEYS.length} themes on one card, for comparison`);
console.log(`  out/captions.md    ${attendees.reduce((n, a) => n + [captions(a).primary, ...captions(a).alternates].filter(Boolean).length, 0)} caption option(s)`);

// ---------------------------------------------------------------------------
// The /field page on the Invitational site.
//
// Same data, same gate: only people who have cleared may_feature appear. It
// exists so the LinkedIn posts have somewhere to point, and so the site shows
// who is coming rather than only asking people to come.
//
// The page is grown from sponsor.html so the header, footer and their styles
// are the site's own rather than a lookalike. The seam is not simply
// </header> .. <footer>: the footer's styles sit in the content region, so the
// tail has to start at the last <style> before <footer> or the footer renders
// bare.
// ---------------------------------------------------------------------------
const SITE = path.join(ROOT_SITE);

const PARTNERS = [
  { name: "Lead Generation World", logo: "assets/lgw-logo-white.png" },
  { name: "Troutman Amin, LLP", logo: "assets/troutman-amin-logo-white.png" },
  { name: "Standard Information", logo: "assets/Standard-information.png" }
];

function buildFieldPage(rows) {
  const shellPath = path.join(SITE, "sponsor.html");
  if (!fs.existsSync(shellPath)) { console.log("\n  field.html skipped — sponsor.html not found"); return; }

  const shell = fs.readFileSync(shellPath, "utf8");
  const headerEnd = shell.indexOf("</header>") + "</header>".length;
  const footerAt = shell.search(/<footer/i);
  const tailStart = shell.lastIndexOf("<style", footerAt);
  if (headerEnd < 9 || footerAt < 0 || tailStart < headerEnd) throw new Error("field.html: shell seams not found");

  const tail = shell.slice(tailStart);
  if (!/spb-footer/.test(tail)) throw new Error("field.html: the tail lost the footer");

  const head = shell.slice(0, headerEnd)
    .replace(/<title>[\s\S]*?<\/title>/, "<title>The Field | Motiv Brands Invitational</title>")
    .replace(/(<meta name="description" content=")[^"]*/,
      "$1Who is joining the 1st Annual Motiv Brands Invitational at Bali Hai Golf Club on 27 January 2027.")
    .replace(/(<link rel="canonical" href="https:\/\/[^/]+)\/sponsor"/, '$1/field"')
    .replace(/(<meta property="og:url" content="https:\/\/[^/]+)\/sponsor"/, '$1/field"');

  const shown = rows.filter(cleared);

  // An empty field page is not worth indexing, and an empty one that *is*
  // indexed reads as a thin event. It opens itself to search the moment there
  // is somebody on it.
  const head2 = shown.length
    ? head
    : head.replace(/<meta name="robots" content="[^"]*">/,
        '<meta name="robots" content="noindex, follow">');

  const person = (a) => `
        <li class="fld-card">
          <span class="fld-name">${esc(a.name)}</span>
          ${a.title ? `<span class="fld-title">${esc(a.title)}</span>` : ""}
          ${a.company ? `<span class="fld-company">${esc(a.company)}</span>` : ""}
        </li>`;

  const partner = (p) => `
        <li class="fld-partner">
          <img src="${p.logo}" alt="${esc(p.name)}" loading="lazy">
          <span>${esc(p.name)}</span>
        </li>`;

  const fieldSection = shown.length
    ? `<ul class="fld-grid">${shown.map(person).join("")}
      </ul>`
    : `<p class="fld-empty">The field is being confirmed now. Names appear here as each guest
        confirms their place &mdash; request an invitation below to be among them.</p>`;

  const body = `
  <section class="fld-hero">
    <div class="spt-container">
      <p class="fld-eyebrow">The Field</p>
      <h1 class="fld-h1">Who You&rsquo;ll Be Playing With</h1>
      <p class="fld-lead">A focused ${EVENT.fieldSize}-player field, invitation only, at ${EVENT.venue}
        on ${EVENT.dateShort}. Championship golf, ${EVENT.prizes} planned prizes, and the
        official Motiv Brands launch celebration to close the afternoon.</p>
    </div>
  </section>

  <section class="fld-section">
    <div class="spt-container">
      <h2 class="fld-h2">Presented By</h2>
      <ul class="fld-partners">${PARTNERS.map(partner).join("")}
      </ul>
    </div>
  </section>

  <section class="fld-section fld-section--alt">
    <div class="spt-container">
      <h2 class="fld-h2">Joining the Field</h2>
      ${fieldSection}
      <p class="fld-cta-row"><a class="fld-cta" href="/start">Request an Invitation</a></p>
    </div>
  </section>

  <style>
    /* Same system as the spotlight cards: layered navy, a grain overlay and
       gold hairlines, so the site and the posts read as one thing. */
    .fld-hero, .fld-section { position: relative; isolation: isolate; }
    .fld-hero::after, .fld-section::after { content: ""; position: absolute; inset: 0;
      z-index: 0; pointer-events: none; opacity: .07; mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 220px 220px; }
    .fld-hero > *, .fld-section > * { position: relative; z-index: 1; }

    .fld-hero { padding: clamp(62px, 8vw, 128px) 0 clamp(44px, 5vw, 76px); color: #fff;
      background:
        radial-gradient(54% 48% at 86% 4%, rgba(32,142,232,.30) 0%, transparent 70%),
        radial-gradient(44% 46% at 2% 100%, rgba(189,145,70,.22) 0%, transparent 72%),
        linear-gradient(168deg, #082741 0%, #04172a 52%, #020d1a 100%); }
    .fld-eyebrow { margin: 0 0 16px; font-family: 'Manrope', sans-serif; font-size: 13px;
      font-weight: 800; letter-spacing: 4.4px; text-transform: uppercase;
      background: linear-gradient(92deg, #f2d998 0%, #bd9146 55%, #f2d998 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent; }
    .fld-h1 { margin: 0 0 22px; font-size: clamp(36px, 5vw, 70px); line-height: 1.03;
      letter-spacing: -2px; text-wrap: balance; }
    .fld-h1::after { content: ""; display: block; width: 128px; height: 3px; margin: 28px 0 0;
      background: linear-gradient(90deg, #f2d998 0%, #bd9146 70%, rgba(189,145,70,0) 100%); }
    .fld-lead { margin: 26px 0 0; max-width: 760px; font-size: clamp(17px, 1.5vw, 20px);
      line-height: 1.64; color: rgba(255,255,255,.76); }

    .fld-section { padding: clamp(50px, 6vw, 96px) 0; color: #fff;
      background: linear-gradient(180deg, #061b33 0%, #04142650 100%), #061b33; }
    .fld-section--alt { background: linear-gradient(180deg, #03101f 0%, #061b33 100%); }
    .fld-h2 { margin: 0 0 clamp(26px, 3vw, 44px); font-size: clamp(26px, 2.8vw, 40px);
      line-height: 1.14; letter-spacing: -.9px; }

    .fld-partners { display: flex; flex-wrap: wrap; gap: clamp(16px, 2.2vw, 28px);
      margin: 0; padding: 0; list-style: none; }
    .fld-partner { display: flex; align-items: center; gap: 15px; padding: 20px 28px;
      border: 1px solid rgba(231,199,127,.22); border-radius: 14px;
      background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.015)); }
    .fld-partner img { height: 34px; width: auto; max-width: 170px; object-fit: contain; }
    .fld-partner span { font-family: 'Manrope', sans-serif; font-size: 15px; font-weight: 700;
      letter-spacing: .2px; color: rgba(255,255,255,.88); }

    .fld-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 20px; margin: 0; padding: 0; list-style: none; }
    .fld-card { position: relative; display: flex; flex-direction: column; gap: 4px;
      padding: 30px 28px; overflow: hidden; border: 1px solid rgba(255,255,255,.10);
      border-radius: 18px;
      background: linear-gradient(165deg, rgba(255,255,255,.07), rgba(255,255,255,.015)); }
    .fld-card::before { content: ""; position: absolute; top: 0; left: 0; width: 42px; height: 2px;
      background: linear-gradient(90deg, #f2d998, rgba(189,145,70,0)); }
    .fld-name { font-family: 'Manrope', sans-serif; font-size: 23px; font-weight: 800;
      letter-spacing: -.4px; }
    .fld-name::after { content: ""; display: block; width: 44px; height: 2px;
      margin: 14px 0 12px; background: rgba(231,199,127,.7); }
    .fld-title { font-size: 14.5px; color: rgba(255,255,255,.68); }
    .fld-company { font-size: 16.5px; font-weight: 700; color: #9ad5fb; }

    .fld-empty { margin: 0; max-width: 640px; font-size: 17px; line-height: 1.64;
      color: rgba(255,255,255,.72); }

    .fld-cta-row { margin: clamp(30px, 3.4vw, 50px) 0 0; }
    .fld-cta { display: inline-flex; align-items: center; justify-content: center;
      min-height: 60px; padding: 0 38px; border-radius: 999px; background: #63bd43;
      color: #03101f; font-family: 'Manrope', sans-serif; font-size: 17px; font-weight: 800;
      letter-spacing: .3px; text-decoration: none;
      box-shadow: 0 16px 40px rgba(99,189,67,.26); }
    .fld-cta:hover { background: #83df59; }
  </style>
`;

  fs.writeFileSync(path.join(SITE, "field.html"), head2 + body + tail, "utf8");
  console.log(`\n  field.html         ${shown.length} of ${rows.length} on the site's /field page` +
    `${shown.length ? "" : "  (empty state — nobody cleared yet)"}`);
}

buildFieldPage(attendees);
