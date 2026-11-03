# Invitational attendee spotlights

LinkedIn spotlight posts for the Motiv Brands Invitational — Bali Hai Golf
Club, Las Vegas, 27 January 2027. One row of a spreadsheet produces one card
and one set of captions, so a spotlight is a data entry job rather than a
design job.

## Layout

    Brand-motiv-Invitational-main/        <- the deploy root, served publicly
      vercel.json                         <- redirects /spotlight/* away
      .vercelignore                       <- excludes spotlight/ from upload
      .gitignore                          <- excludes the data and output
      field.html                          <- generated
      spotlight/
        build-spotlights.js
        attendees.sample.csv              <- placeholder names, safe
        README.md
        data/                             <- REAL EXPORTS. Never public.
          submission from invite request.csv
        out/                              <- everything generated
          cards.html · captions.md · png/

## Read this before changing anything about deployment

`data/` holds a real registration export: names, emails, phone numbers and IP
addresses. This folder sits **inside** the directory Vercel serves, so two
guards keep that export off the public domain:

1. **`.vercelignore`** contains `spotlight/`, so the folder is not uploaded.
2. **`vercel.json`** redirects `/spotlight/:path*` to `/`, so even if a file
   were uploaded the URL would not serve it.

Either one alone would probably do. Both together mean a mistake in one does
not expose anyone. **Do not remove either**, and deploy from the folder
holding `vercel.json` — this one.

## Designs

Five themes over one set of markup, in `themes.js`. The layout is written
once; a theme only changes palette, ornament and composition.

| `--theme=` | What it is |
|---|---|
| `navy` *(default)* | The house style. Matches the Invitational site exactly. |
| `ivory` | Gallery invitation — light stock, ink serif, bronze foil. Stands out in a dark feed. |
| `emerald` | Club heritage — fairway green and gold. Reads as golf with no clipart. |
| `deco` | Las Vegas — symmetrical, centred, gold linework. The most formal. |
| `mono` | Stripped back — no frame, no watermark, one enormous name. The most modern. |

`out/designs.html` renders all five on the same person, so they can be
compared properly rather than from a description. Open it and pick one.

Adding a sixth is a new entry in `themes.js`: a key, a label, a note, and a
block of CSS scoped to `.card--<key>`. Nothing else needs touching.

## Run it

    cd Brand-motiv-Invitational-main/spotlight
    node build-spotlights.js [path/to/export.csv] [--theme=ivory] [--cleared-all]

With no path it reads `data/submission from invite request.csv`. It writes:

| File | What it is |
|---|---|
| `out/cards.html` | one 1200×1200 card per attendee — LinkedIn's square post |
| `out/captions.md` | caption options plus the running order |
| `../field.html` | the `/field` page on the Invitational site |

Open `out/cards.html` in a browser to review the whole set at once. It copies
the brand mark in beside itself, so `out/` can be zipped and handed on without
the site around it. Finished PNGs live in `out/png/`.

## The CSV

A raw GoHighLevel export works as input — the column names it uses are
recognised and mapped, so there is no reshaping by hand:

    node build-spotlights.js "../../spotlight-data/submission from invite request.csv"

`First Name` + `Last Name` become `name`, and `Organization` becomes
`company`. A sheet already using the columns below passes straight through.

| Column | Required | Notes |
|---|---|---|
| `name` | yes | drives the card, the monogram and the filename anchor |
| `title` | no | the registration form has no title field, so this is usually blank and the card omits the line |
| `company` | no | |
| `may_feature` | no | `yes` once the person has agreed to be named publicly. Anything else blocks the card — see below |
| `linkedin` | no | carried into captions.md so the poster can tag them |
| `role` | no | anything matching *partner/sponsor/presenting* switches the card and copy to the presenting-partner treatment |
| `quote` | no | when present the card shows it and the first caption option is quote-led |

Commas inside a field need quoting — `"Troutman Amin, LLP"`.

## Turning cards into images

The cards are HTML, not images, because the brand faces (Playfair Display,
Manrope, DM Sans) are web fonts and a browser is the only thing that renders
them properly. To publish, screenshot each `.card` element at 1200×1200 —
browser devtools will do it, or ask Claude to render the set with Playwright.

Deliberately no image library here: it would be a dependency to install and
keep working for something a screenshot already does.

## Captions

Three shapes, rotated so a run of posts does not read as a mail merge:

- **welcome** — names the person and the event, the standard announcement
- **field** — "the field is taking shape", better for the middle of a run
- **quote-led** — used automatically when the row has a quote
- **partner** — replaces the above for presenting partners

Every caption is built from `EVENT` at the top of the script. Change the date,
venue, field size or URL there and both cards and captions follow.

## The publicity gate

A spotlight puts someone's name and employer on a public post saying where
they will be on a given date. In this industry that is sometimes
competitively sensitive.

The registration form does not ask for permission to do it. Its two tick
boxes consent to receiving texts and marketing *from* Motiv Brands — neither
is permission to be named publicly. So registering is not a yes.

The build therefore blocks every row by default: the card carries a red
"publicity consent not confirmed" banner across the top, and the caption is
marked in `captions.md`. Put `yes` in a `may_feature` column and re-run, and
both clear.

The durable fix is a tick box on the registration form — *"You may include my
name and organization in Invitational announcements and social posts"* — so
everyone registering from then on is ready without being chased.

`EVENT.url` points at https://invitational.motivbrands.co, confirmed live.

## The /field page on the Invitational site

`field.html` is written into the Invitational project on every run, so the
site shows who is coming rather than only asking people to come, and the
LinkedIn posts have somewhere to point.

It is grown from `sponsor.html` rather than written fresh, so the header,
footer and their styles are the site's own and stay in step with it. One
subtlety worth knowing before editing that code: the seam is **not** simply
`</header>` to `<footer>`. The footer's styles sit inside the content region,
so the tail has to start at the last `<style>` before `<footer>` or the
footer renders bare.

The same publicity gate applies — only people with `may_feature` set appear.
Today that is nobody, so the page shows the three presenting partners and an
honest "the field is being confirmed" state, and sets itself to `noindex`. It
opens to search automatically once somebody is on it.

**Not yet linked from the homepage nav.** Adding it is one line in
`index.html` alongside `/launch-party` and `/sponsor`, worth doing once there
are names on the page rather than while it is empty.

## What is not built

Pulling the attendee list straight out of GoHighLevel, where registrations
land (the form on the Invitational site is a LeadConnector embed). That needs
GHL API access, which is not in this repo — the existing `api/_lib/ghl.js` in
the other Motiv projects only pushes leads *in* by webhook and cannot read a
list back out. A CSV export from GHL is a perfectly good input in the
meantime, and is what this reads.

Scheduling or auto-posting to LinkedIn is also not built, and should not be
until someone has decided whose account posts and whether each attendee has
agreed to be featured.
