# winterdom.com

Personal site of Tomas Restrepo. Hugo, ported from Jekyll, which was ported from
WordPress. 1,169 posts going back to 2003.

Currently mid-redesign. The design is settled and written down:

- **`design/SPEC.md`** — the build spec. Tokens, typography, layout, every
  component and article element, the taxonomy rules, accessibility. Read this
  before writing templates or CSS.
- **`design/comps/`** — 13 static HTML mockups of the same decisions. Open them
  in a browser, read them for metrics and markup shape. They are *not* templates.

Work in the order given at the end of SPEC.md. Each step is usable before the
next one starts.

## Build

    hugo                 # build into public/
    hugo server -D       # preview at http://localhost:1313/

New post: `hugo new content posts/YYYY-MM-DD-some-slug.md`. The `YYYY-MM-DD-`
prefix is load-bearing — the date drives the URL and the rest is the slug.

## Do not touch these settings

Every one of these is commented in `hugo.yaml` with the reason. They exist to
keep 1,169 existing URLs working. Changing any of them breaks links that have
been live for up to twenty years.

| Setting | Why |
| --- | --- |
| `timeZone: UTC` | Jekyll built under UTC; 69 posts shift a day without it |
| `disablePathToLower: true` | One slug carries a capital and 404s when lowercased |
| `frontmatter.date: ["date", ":filename"]` | 52 posts have no date field; 230 days hold more than one post, so time-of-day drives ordering |
| `permalinks.posts` | `/:year/:month/:day/:slug`, matching Jekyll exactly |
| `outputFormats.RSS.baseName: feed` | The feed has always lived at `/feed.xml` |
| `security.allowContent` | 1,117 posts are `text/html`; Hugo 0.166 refuses them by default |
| `markup.goldmark.renderer.unsafe: true` | Those same posts are raw HTML |

If a change seems to require touching one of these, stop and ask.

## Content reality

Most posts are **not markdown**. 1,117 of 1,169 are raw HTML from the WordPress
era, carrying Bootstrap classes, `<font>` tags, inline styles, tables built for a
960px column and images with hard-coded widths.

Consequences for any CSS written here:

- **Style element selectors, not classes.** Scope the article sheet under
  `.article-body` and let it reach whatever is inside. Anything keyed to a class
  the new templates emit will miss two decades of posts.
- Legacy `<pre>` blocks never passed through Chroma and have no token classes.
  Style `pre` and `code` so a bare block still lands in a readable surface box.
- Comment bodies are a mix of plain text with CRLF breaks and real WordPress
  markup rendered as `safeHTML`.

## Taxonomy

Two taxonomies, both already populated. 41 categories, uneven: `.NET` has 245
posts, six categories have one each.

A post can hold **more than one category** — 267 do. The convention is:

- List rows show the **first category alphabetically**, alone. Sort before
  indexing; WordPress wrote them in arbitrary order.
- The article meta line shows **all** of a post's categories.

Tags are lowercase and unlimited per post. Categories display verbatim,
including `C++` and `.NET`.

## Privacy

`author_email` in archived comments holds third-party addresses that were never
public. Never emit it, and never derive a gravatar hash from it. The existing
`layouts/_partials/comments.html` is correct on this point — keep it that way.
