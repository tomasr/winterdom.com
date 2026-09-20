# Reference comps

Static HTML mockups of the 2026 redesign. Open any of them in a browser.

**These are not Hugo templates and must not be copied wholesale into `layouts/`.**
They are hand-built pages with inline styles, written to pin down metrics and
markup shape. The rules they illustrate are written down in [../SPEC.md](../SPEC.md),
which is the source of truth when the two disagree.

| File | Shows |
| --- | --- |
| `Logo.html` | The mark at every size, the wordmark, the æ avatar |
| `Foundations.html` | Colour tokens (light and dark), type scale, spacing, component parts |
| `Main.html` | Home |
| `Post.html` | Article: header, series box, body, byline, prev/next, archived comments |
| `PostDark.html` | The same article with dark tokens applied |
| `Elements.html` | Every markdown construct, plus the syntax token map |
| `States.html` | Hover / focus / disabled, the open phone menu, breakpoints, icon and OG exports |
| `Archive.html` | Year rail, year-grouped list, tag index, pagination |
| `Categories.html` | All 41 categories, sorted by count |
| `About.html` | Bio, open source list, portrait |
| `Pages.html` | Single tag, single category, 404, the three pagination states |
| `MobileHome.html`, `MobilePost.html` | Phone layout at 390px |

## What is real and what is not

Real, read from this repo on 20 September 2026:

- Category names and post counts
- The comment data shape (`id`, `author`, `author_url`, `date`, `content` — flat, no threading)
- Template paths, permalink scheme, timezone and Chroma settings
- The About page copy and the footer disclaimer

Invented placeholders, safe to ignore:

- Post titles, bodies and excerpts
- The two sample comment bodies
- `portrait.jpg` — referenced by `About.html`, `Post.html`, `PostDark.html` and
  `MobilePost.html`, but not committed. Drop a square portrait in this folder to
  see those pages complete.

## Accent colour

The comps hard-code `#3C6E71`. In the build it is `--accent`, and it changes in
dark mode — see the token table in SPEC.md.
