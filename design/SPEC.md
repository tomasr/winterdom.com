# Winterdom redesign — build spec

Design handoff for winterdom.com · 20 September 2026
Source of truth for the rebuild. The comps in `comps/` show the same decisions visually.

## Overview

The handoff is two pieces: the design canvas shows what the site looks like, this spec says what it is made of. Build from both.

The canvas holds these artboards.

| Artboard | What it settles |
| --- | --- |
| Identity | The crystal mark, the wordmark, the æ avatar, and the rules for each |
| Foundations | Colour tokens in both themes, type scale, spacing rhythm, component parts |
| Home | Hero, recent posts, projects band, footer |
| Article | Post header, series box, body, byline, prev/next, archived comments |
| Article · dark | The same page with the dark tokens applied |
| Article elements | Every markdown construct, plus the syntax token map |
| States & breakpoints | Hover, focus and disabled states, the open phone menu, the four widths, icon and OG exports |
| Archive & tags | Year rail, year-grouped list, tag index, pagination |
| Categories | All 41, sorted by count |
| About me | Bio, open source list, portrait, disclaimer |
| Tag · category · 404 · pagination | The four templates with no comp of their own |
| Home · 390, Article · 390 | Phone layout and the collapsed header |

Work in this order: tokens and fonts, then the header and footer partial, then the article template, then the list and taxonomy pages. Everything else is a rearrangement of those parts.

This version is checked against the repo. Category names and counts, the comment data shape, the template paths, the permalink and timezone settings and the Chroma config are all read from `winterdom.com` as it stands on 20 September 2026. What remains invented is sample prose: post titles and bodies in the comps, the two placeholder comment bodies, and the excerpt lines — all marked where they appear.

## Decisions taken

These are settled. An implementer should not reopen them.

| Question | Decision |
| --- | --- |
| Site search | Dropped. No search field, no index, no Pagefind. |
| Comments | Read-only. The WordPress export is archived in each post's front matter and rendered; no new comment form anywhere. |
| Fonts | Google Fonts CDN. No self-hosting, no subsetting step. |
| Permalinks | `/:year/:month/:day/:slug`, already preserved by the config, along with `timeZone: UTC` and `disablePathToLower`. |
| Home page | Stays short — the most recent handful of posts, then a link out. It does not paginate. |
| Archive | Paginates by year: one page per year, not one long page. |
| Dark mode | Specced now, in tokens and in one comp, so the CSS is written once. |
| Categories | Keep all 41 as they are. A post may hold several; the first alphabetically is its primary. |
| Category index | All 41, sorted by count, long tail in a lighter treatment. |
| Portrait | The photo supplied on 20 September 2026, replacing the gravatar on About and in the article byline. |
| Syntax colours | The six-token map below replaces `assets/css/monokai.css`. |

Everything that was open on the design side is now closed. What remains is listed at the end.

## Design tokens

Nine colours, two themes. Contrast is measured against that theme's `--paper` and every pairing below clears WCAG AA for body text.

| Token | Light | Dark | Role | Contrast on paper |
| --- | --- | --- | --- | --- |
| `--paper` | `#FFFFFF` | `#17191A` | Page ground | — |
| `--surface` | `#F3F4F3` | `#202324` | Code blocks, cards, callouts | — |
| `--surface-2` | `#E9EBEA` | `#2A2E2F` | Code block header bar, pressed states | — |
| `--rule` | `#D9D9D9` | `#343839` | Hairlines, borders, input outlines | — |
| `--muted` | `#5C605E` | `#9BA2A0` | Dates, captions, excerpts, footer | 6.4 / 6.7 |
| `--ink` | `#353535` | `#D7DBD9` | Body text | 12.3 / 12.5 |
| `--ink-strong` | `#1D1F1F` | `#F2F4F3` | Headings, wordmark, post titles | 16.5 / 17.4 |
| `--accent` | `#3C6E71` | `#8FBEC0` | Links, the mark, category eyebrows | 5.7 / 8.7 |
| `--accent-hover` | `#2A5254` | `#A8CFD0` | Link hover, button active | 8.1 / 10.9 |
| `--deep` | `#284B63` | `#7FA6C0` | Syntax keywords, rare emphasis | 9.2 / 6.8 |

The dark accent is a lift of the teal, not a different hue — `#3C6E71` on a dark ground only reaches 2.2:1, which is why it changes.

```css
:root {
  --paper: #FFFFFF;
  --surface: #F3F4F3;
  --surface-2: #E9EBEA;
  --rule: #D9D9D9;
  --muted: #5C605E;
  --ink: #353535;
  --ink-strong: #1D1F1F;
  --accent: #3C6E71;
  --accent-hover: #2A5254;
  --deep: #284B63;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #17191A;
    --surface: #202324;
    --surface-2: #2A2E2F;
    --rule: #343839;
    --muted: #9BA2A0;
    --ink: #D7DBD9;
    --ink-strong: #F2F4F3;
    --accent: #8FBEC0;
    --accent-hover: #A8CFD0;
    --deep: #7FA6C0;
  }
}

:root[data-theme="dark"] { /* same dark block, for the manual toggle */ }
```

Set `background: var(--paper)` and `color: var(--ink)` on `body` explicitly. Honour the system preference by default and let `data-theme` on `<html>` override it, so a toggle can be added later without touching any other rule.

Radii: 3px on inline code, 4px on inputs, buttons and boxes, 5px on code blocks, 6px on the large identity panel, 999px on tag pills. Nothing casts a shadow.

## Typography

Three families, all from the Google Fonts CDN in one request.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
```

Newsreader is a variable serif with an optical-size axis — let it track the font size automatically (`font-optical-sizing: auto`, which is the default) rather than pinning `opsz`. Its italic is used for pull quotes and nothing else.

| Role | Family | Size / line-height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Page title (h1) | Newsreader | 50 / 1.10 | 500 | -0.02em |
| Post title (h1) | Newsreader | 44 / 1.12 | 500 | -0.012em |
| Section (h2) | Newsreader | 30 / 1.25 | 500 | -0.012em |
| Subsection (h3) | Newsreader | 24 / 1.3 | 500 | -0.012em |
| Minor (h4) | IBM Plex Sans | 17 / 1.4 | 600 | 0 |
| List item title | Newsreader | 25 / 1.25 | 500 | -0.012em |
| Pull quote | Newsreader italic | 21 / 1.55 | 400 | 0 |
| Body | IBM Plex Sans | 18.5 / 1.72 | 400 | 0 |
| Small / excerpt | IBM Plex Sans | 15–16 / 1.6 | 400 | 0 |
| Caption / footer | IBM Plex Sans | 13 / 1.6 | 400 | 0 |
| Eyebrow, date, tag | IBM Plex Mono | 11–13 / 1.5 | 400 | 0.14–0.16em, uppercase |
| Code | IBM Plex Mono | 13.5 / 1.75 | 400 | 0 |
| Inline code | IBM Plex Mono | 0.88em of parent | 400 | 0 |

Stacks:

```css
--font-display: "Newsreader", Georgia, "Times New Roman", serif;
--font-body: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
--font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
```

On phones the top two sizes drop: page title to 33/1.14, post title to 32/1.16, h2 to 25, body to 17/1.70. Everything else holds.

Two rules that matter more than they look. Mono in uppercase always carries its tracking — untracked uppercase mono reads as a bug. And nothing goes below 13px anywhere, including the footer disclaimer.

## Layout and breakpoints

One centred column, no sidebar, at every width. The page is a content band inside a gutter; article text is narrower than the band.

| Width | Gutter | Content band | Article measure | Header |
| --- | --- | --- | --- | --- |
| < 640 | 24px | fluid | fluid | Wordmark + hamburger |
| 640–899 | 40px | fluid | fluid, max 620 | Wordmark + hamburger |
| 900–1199 | 56px | fluid, max 960 | 660 | Full nav, gap 22px |
| ≥ 1200 | 80px | 1120 | 720 | Full nav, gap 30px |

The nav collapses to the hamburger below 900px, because five items plus the RSS icon and the wordmark stop fitting cleanly. The article measure is the one number worth protecting — 720px of IBM Plex Sans at 18.5px is roughly 72 characters, and it should never stretch past that even on a 2560px display.

Everything sits on an 8px rhythm. The spacing scale is 4, 8, 16, 24, 40, 64. Section gaps inside a page run 44–64px; the gap between a section heading rule and its first row is 20–24px.

Separation is a 1px `--rule` hairline or a `--surface` fill. Never a shadow, never a coloured left border, never a gradient.

The footer is pinned to the bottom of the viewport on short pages — `min-height: 100dvh` on a flex column wrapper with `margin-top: auto` on the footer.

The phone menu, when open, is a full-width panel below the header: the five nav items stacked at 17px with 44px touch targets, a hairline between each, the RSS link last, and a close button replacing the hamburger. No overlay, no slide-in animation, and the page behind it does not scroll.

## Components

**Header.** Mark at 27px plus the wordmark at 27px Newsreader 500, 12px apart, linking home. Nav on the right: Writing, Archive, Categories, Tags, About, then the RSS icon. The current section gets `--ink-strong` text and a 2px `--accent` underline 3px below the baseline; the rest are `--muted`. A 1px `--rule` under the whole header, 22px below the row.

**Footer.** 1px `--rule` above, then copyright and the disclaimer on the left at 14px and 13px, social links on the right at 14px `--muted`. The disclaimer text is fixed and appears on every page.

**Post list row.** Date on the left in mono at 13px `--muted`, 96px wide. On the right: the category eyebrow, the title at 25px Newsreader, a one-line excerpt at 16px `--muted`, then the tag pills. A 1px `--rule` under each row. On phones the date and category share one line above the title and the columns collapse.

**Category versus tag.** This distinction has to survive implementation.

|  | Category | Tag |
| --- | --- | --- |
| Count per post | One or more — 267 posts hold several | Any number |
| Shown in a list row | The first alphabetically, alone | All of them |
| Rendered as | Mono, uppercase, 11px, 0.16em tracking, `--accent`, no border | Pill: 12px mono, 3px 10px padding, 1px `--rule` border, 999px radius, `--muted` |
| Where | Above the title in lists; in the article meta line after "filed in", where every one of them appears | Below the title in lists, after a "Tagged" label in the article header |

**Byline.** 56px circular portrait, name at 15px weight 500, one line of bio at 14px `--muted` with a link to About. Appears at the foot of the article, not the top.

**Pagination.** Previous and next as text links at either end, the page count in mono `--muted` in the middle: `Page 2 of 14`. No numbered page list — with 117 pages of history it would wrap. Disabled ends render as `--muted` text, not as links.

**Series navigation.** Sits directly under the article title block, above the body: a `--surface` box with a mono eyebrow reading `Part 2 of 3 · kondex`, then the three part titles as a numbered list, the current one in `--ink-strong` and unlinked, the others as links. Driven by a `series` key in front matter.

**Archived comments.** The shape is fixed by the existing `comments.html` partial, which reads a `comments` array from each post's front matter: `id`, `author`, an optional `author_url`, `date`, `content`. **The list is flat** — the export carries no parent references, so there is no threading and no reply indent. Sort by date.

It sits below the prev/next nav, under a heading that reads `3 Comments` (singular at one), with a mono note beside it: `archived from WordPress — closed`. Each comment is a 20px-padded `--surface` block: author at 15px weight 500 — a link with `rel="nofollow ugc noopener"` where `author_url` is set, plain text otherwise — date in mono 12px `--muted`, body at 16px. No reply button, no form. Omitted entirely when a post has none.

No avatars, and this is deliberate rather than aesthetic: `author_email` holds third-party addresses that were never public, so neither it nor a gravatar hash derived from it is ever emitted.

Bodies are mixed. Some are plain text with CRLF breaks and take `comment-body-plain` plus `white-space: pre-line`; others carry real WordPress markup rendered as `safeHTML`, so the article's `p`, `br` and `a` styles have to reach inside a comment block too.

## Article elements

Every construct Hugo's renderer can emit needs a rule, or the implementer invents one. Vertical gap between block elements is 26px unless stated.

Most of this content is not markdown. 1,117 of the 1,169 posts are raw HTML committed in the WordPress era, rendered with `unsafe: true`, and they carry markup this spec never generates: Bootstrap classes, `<font>` tags, inline `style` attributes, tables built for a 960px column, images with hard-coded widths. **Style element selectors, not classes.** Anything keyed to a class the new templates emit will simply miss two decades of posts. Scope the whole element sheet under `.article-body` and let it reach whatever is inside.

| Element | Treatment |
| --- | --- |
| h2 | 30px Newsreader, 18px extra space above, no rule under it |
| h3 | 24px Newsreader, 12px extra above |
| h4 | 17px IBM Plex Sans 600, 8px extra above |
| Paragraph | 18.5 / 1.72, `--ink` |
| Unordered list | Disc marker in `--muted`, 22px indent, 10px between items, text at body size |
| Ordered list | Decimal in mono `--muted`, same metrics |
| Nested list | One level only in the design; indent 22px, marker switches to a hollow circle / lower-alpha |
| Table | Full measure, 1px `--rule` under each row, header row in mono 11px uppercase tracked, cells 15px, 10px 14px padding, no zebra striping, no outer border |
| Wide table | Wraps in a horizontally scrolling container with a `--rule` on the right edge as an affordance |
| Figure | Image at full measure, 4px radius; caption below at 13px `--muted`, centred, 10px gap |
| Wide image | May bleed to the content band (1120) while text stays at 720 |
| Blockquote | 2px `--accent` left rule, 26px padding-left, Newsreader italic 21 / 1.55 in `--ink-strong` |
| Horizontal rule | A centred 40px 1px `--rule` segment, not a full-width line, with 40px above and below |
| Footnote reference | Superscript mono 11px in `--accent`, no brackets |
| Footnotes block | Below the body above the byline, under a mono uppercase `Notes` label, items at 15px `--muted` with a return arrow |
| Callout | `--surface` fill, 4px radius, 18px 20px padding, mono uppercase label line in `--accent`, body at 16px. No icon, no coloured border |
| Inline code | 0.88em, `--surface` fill, 2px 6px padding, 3px radius, `--ink-strong` |
| Keyboard | Same as inline code plus a 1px `--rule` border |
| Link in body | `--accent`, no underline at rest, underline on hover, `text-underline-offset: 2px` |
| Long URL | `overflow-wrap: anywhere` on body text so raw links never blow out the measure |
| Embedded gist or video | Full measure, 4px radius, 16:9 ratio box for video |

Headings take `scroll-margin-top: 24px` so in-page anchors do not land flush against the viewport edge. Anchor links on headings are optional — if added, a `#` in `--muted` appearing on hover to the left of the heading, never a permanent one.

First element after the article title block gets no extra top margin; last element before the byline gets no extra bottom margin.

## Code blocks and syntax

A code block is a `--surface` box with a 1px `--rule` border and a 5px radius. It carries a header bar in `--surface-2`, separated by a 1px rule: the filename or language on the left in mono 11px uppercase tracked `--muted`, a Copy button on the right. Body is mono 13.5 / 1.75 with 18px 20px padding, scrolling horizontally rather than wrapping.

The header bar is omitted when the fence carries no filename and no language.

The config already emits Chroma classes rather than inline styles, which is what this needs. Two changes:

```toml
[markup.highlight]
  noClasses = false   # already set
  lineNos = false     # already set
  style = "monokai"   # remove — inert with noClasses, and misleading
  tabWidth = 2        # add
```

`assets/css/monokai.css` is replaced by the token map below. It has to go rather than be overridden: it is a dark-background theme, so on a white page its comment greys and background rules fight the design at every step. Delete the file and the `style` key together.

Line numbers stay off — they cost too much of a 720px measure and nothing on the site refers to a line by number. To point at a line, use `hl_lines`: a `--surface-2` band across the full block width.

One caveat from the content. Goldmark runs with `unsafe: true`, and 1,117 of the 1,169 posts are raw HTML from the WordPress era. Many carry their own `<pre>` blocks that never passed through Chroma at all, with whatever markup the old site used. Style `pre` and `code` defensively — assume no wrapper div, no header bar, no token classes — so a legacy block still lands inside a readable surface box. The header bar is a progressive enhancement for fenced blocks, not a requirement.

The token map is deliberately small. Six colours, not twenty.

| Chroma class | Covers | Light | Dark |
| --- | --- | --- | --- |
| `.k`, `.kd`, `.kn`, `.kr`, `.kt` | Keywords, declarations, types | `#284B63` | `#7FA6C0` |
| `.s`, `.s1`, `.s2`, `.sb`, `.sd` | Strings and docstrings | `#2A5254` | `#9FCFC4` |
| `.c`, `.c1`, `.cm`, `.cs` | Comments, italic | `#6A706D` | `#8A918E` |
| `.na`, `.nt`, `.nf`, `.nc` | Attributes, tags, function and class names | `#1D1F1F` | `#F2F4F3` |
| `.m`, `.mi`, `.mf`, `.no`, `.nb` | Numbers, constants, builtins | `#5C605E` | `#9BA2A0` |
| `.o`, `.p`, everything else | Operators, punctuation, plain text | `#353535` | `#D7DBD9` |
| `.gi` / `.gd` | Diff added / removed | `#2A5254` on `#E6EFEA` / `#7A3B2A` on `#F6E8E3` | `#9FCFC4` on `#1E2A26` / `#D9A18C` on `#2C211E` |

JSON has no keywords, so object keys land on `.nt` and read as `--ink-strong` — that is intended, and it is what the comps show.

Every pairing above clears 4.5:1 against its own `--surface`. If a language needs a token this map does not name, it inherits the plain-text colour rather than getting a new one.

## Page types

Ten templates, in the flat `layouts/` tree this site already uses — not the old `_default/` arrangement. Six have a comp; the other four are compositions of parts that already exist.

| Page | Template | Comp | Status |
| --- | --- | --- | --- |
| Home | `layouts/home.html` | Home | Exists, paginates all posts — rewrite to the short form |
| Article | `layouts/single.html` | Article | Exists, Bootstrap-era markup — full rewrite |
| Archive index | `layouts/archive/list.html` | Archive & tags | New. No archive section exists yet |
| Single year | `layouts/archive/year.html` | — | New. That year's rows, paginated at 50 |
| Category index | `layouts/categories/taxonomy.html` | Categories | Replaces the shared `taxonomy.html` tab-pane page |
| Single category | `layouts/categories/term.html` | Tag · category | Replaces the shared `term.html` |
| Tag index | `layouts/tags/taxonomy.html` | Archive & tags | The pill cloud |
| Single tag | `layouts/tags/term.html` | Tag · category | `#tagname` in mono as h1, then post rows |
| About | `layouts/page/single.html` | About me | Content already at `content/me/_index.md` |
| 404 | `layouts/404.html` | Tag · category | Exists, 2.9KB of Bootstrap — replace |

The current `taxonomy.html` renders every term and all its posts into one page of hidden tab panes — 300KB for categories alone. Splitting it into a real index plus per-term pages is the single biggest win in this list, and it is why category links currently point at `/categories/#anchor` instead of a page.

Keep the `anchor.html` and `termpages.html` partials; `postdate.html` and `sidebar.html` go. The site has no sidebar in this design.

Projects on the home page (Viasfora, kondex, PipelineTesting) currently link nowhere. Either point them at their GitHub repos or add a projects page — a decision, not a design gap.

The feed keeps whatever URL the current Hugo config produces. No styling; an XSL stylesheet for the feed is out of scope.

## Taxonomy

Both taxonomies already exist and carry real data. Nothing here needs migrating.

```yaml
taxonomies:
  category: "categories"
  tag: "tags"
```

There are 41 categories across 1,169 posts, inherited from WordPress. They stay as they are, sorted by count rather than alphabetically, because the distribution is extremely uneven.

| Tier | Categories | Range |
| --- | --- | --- |
| Large | .NET, BizTalk, Personal, Development | 121–245 posts |
| Working | Tools, Web Services, WinFX, WCF, Blogging, Architecture, Workflow, Vista, PowerShell, Azure, Visual Studio, Enterprise Services, XML, Vim, Linux, VS Color Scheme, ASP.NET, DLR | 7–89 posts |
| Long tail | C++, IIS, Oslo, WPF, Fonts, QuickCounters, Uncategorized, Commerce Server, Java, LINQ, Castle, MSMQ, VSTO, Debugging, Host Integration Server, NHibernate, Ruby, Troubleshooting, Windows | 1–5 posts |

The index shows all 41, largest first, with the tail in a lighter treatment in its own column. Every category keeps a working page, including the six holding a single post.

**A post can hold more than one category.** 902 posts have one, 191 have two, 64 have three, and twelve have four to six. The design absorbs this with a primary-category convention rather than a data migration:

- The category eyebrow on a list row shows the **first category alphabetically**, and only that one.
- The article's own meta line shows **all** of a post's categories, comma-separated after "filed in".
- Nothing else in the design assumes a post has exactly one.

In Hugo, sort first and take `(index . 0)`. Do not read `.Params.categories` unsorted — WordPress wrote them in arbitrary order, so an unsorted eyebrow can change between builds.

Tags stay lowercase; categories display verbatim, including `C++` and `.NET`. Anchors come from the existing `anchor.html` partial, and `disablePathToLower: true` is already set for the same reason the permalinks need it.

One real gap: no post carries a `summary`. List pages currently truncate `.Plain` at 50 words, which reads badly against a one-line excerpt slot. Either author `summary` going forward and let old posts fall back, or clamp the fallback to one line in CSS.

`/categories.html` is an alias on the category index and has to survive; it is already declared in `content/categories/_index.md`.

## Assets and icons

The mark is pure SVG — three strokes crossing at 60° with branch ticks, on a 32×32 viewBox, `currentColor` stroke, round caps. Stroke weight scales inversely with size: 1.5 at 84px, 1.7 at 27px, 2.0 at 22px, 2.6 at 24px in isolation, and below 20px the ticks are dropped so only the three arms remain at weight 3.4. Inline it in the header partial rather than loading a file, so it inherits the theme colour.

| Asset | Size | Source |
| --- | --- | --- |
| `favicon.svg` | 32×32 | The æ monogram, white on `#3C6E71`, 7px radius |
| `favicon.ico` | 32, 16 | Same, rasterised |
| `apple-touch-icon.png` | 180×180 | æ on `#3C6E71`, 40px radius, no padding |
| `icon-512.png` | 512×512 | Same, for the web manifest |
| OG / Twitter card | 1200×630 | `--paper` ground, mark top-left at 64px, post title in Newsreader 64px over up to three lines, wordmark and date bottom-left in mono. Generated per post |
| Portrait | 296×296 @2x | The supplied photo, square crop, circular mask at render time |

The æ is the small-size mark, not a second brand — the crystal loses legibility below about 20px and the æ does not. Both are on the Identity artboard.

Generate the OG cards with Hugo's image processing at build rather than by hand; falling back to a single static card using the wordmark is acceptable for pages without a title.

Post images go through Hugo's `images` pipeline: resize to 1440px wide, WebP with a JPEG fallback, `loading="lazy"` on everything below the fold, explicit `width` and `height` to stop layout shift. The old Jekyll image paths need to survive the move — that is part of the permalink work you have already done.

## Accessibility

The design is drawn to meet AA; the templates have to not break it.

Every interactive thing is a real element. A `<button>` for the menu toggle and the copy buttons, an `<a href>` for anything that navigates, `<time datetime>` for every date. Never a `div` with an `onClick` — the tab key skips it.

Focus is visible and is not the browser default: a 2px `--accent` outline with a 2px offset, applied on `:focus-visible` only, so mouse users never see it. It must be visible against both `--paper` and `--surface`.

| Requirement | Detail |
| --- | --- |
| Skip link | First focusable element, hidden until focused, jumps to `#main` |
| Landmarks | `<header>`, `<nav>`, `<main id="main">`, `<article>`, `<aside>`, `<footer>` |
| Heading order | Exactly one `h1` per page; no level skipped |
| Icon buttons | `aria-label` on the RSS link, the menu toggle, and every copy button |
| Menu toggle | `aria-expanded` and `aria-controls`; focus moves into the panel on open and back to the toggle on close; Escape closes it |
| Current nav item | `aria-current="page"` — the underline is not enough on its own |
| Touch targets | 44×44px minimum on every control, including tag pills on phones |
| Reduced motion | `prefers-reduced-motion: reduce` disables the menu transition and any scroll behaviour |
| Images | Real `alt` text from front matter; decorative images get `alt=""` |
| Language | `lang="en"` on `<html>` |

The tag pills at 3px vertical padding are below 44px in the desktop comp. That is acceptable on pointer devices, but on touch widths they need their hit area padded out — use a pseudo-element rather than making the pill visually taller.

One trap worth naming: the category eyebrow is uppercase via `text-transform`, so screen readers still get the authored casing. Do not author it uppercase in front matter.

## Implementation order

Work top down. Each step is usable before the next starts.

- [ ] Tokens, font link, base element styles, the two-theme setup
- [ ] Header and footer partials, including the phone menu and the inline mark
- [ ] The post-list row partial — every list page depends on it
- [ ] Article template: title block, body element styles, Chroma config and the token map
- [ ] Byline, prev/next, series box, archived comments
- [ ] Home
- [ ] Archive index and single-year pages with pagination
- [ ] Category index, single category, single tag
- [ ] About, 404
- [ ] Favicon set, OG card generation, web manifest
- [ ] Accessibility pass: keyboard walk of every page type, axe run, contrast spot check in both themes

Config changes that go with it, all in `hugo.yaml`:

- Drop `style: "monokai"` from `markup.highlight` and delete `assets/css/monokai.css`
- Add `tabWidth: 2`
- `pagination.pagerSize` stays at 10 for the archive and term pages; the home page takes its own count in the template, not from config
- Leave `timeZone`, `disablePathToLower`, `frontmatter.date`, `permalinks`, the RSS `baseName` and the `security.allowContent` policy exactly as they are — each is load-bearing and commented in place

Still open, in rough order of how much they block:

1. **Post excerpts.** No post has a `summary`, so list rows fall back to a 50-word truncation of `.Plain`. Author `summary` going forward, or clamp the fallback to one line. Cosmetic, but it is visible on every list page.
2. **Project links.** The three cards on the home page point nowhere. Viasfora and PipelineTesting have GitHub URLs in `content/me/_index.md`; kondex does not.
3. **The tail categories.** Six categories hold one post each. They keep working pages, but `Uncategorized` (4 posts) is worth reassigning by hand at some point.
4. **Legacy image paths.** Posts reference `params.images_base` at `static.winterdom.com`. Nothing in this design changes that, but the `images` pipeline described above only applies to new posts.

None of these blocks starting at step one.
