Winterdom
=====

Blog/Website by Tomas Restrepo. Built with [Hugo](https://gohugo.io/).
Theme based on the [dbyll theme](https://github.com/dbtek/dbyll) by dbtek,
ported from Jekyll.

Building
--------

    hugo                 # build into public/
    hugo server -D       # preview at http://localhost:1313/

New post
--------

    hugo new content posts/YYYY-MM-DD-some-slug.md

Post filenames must keep the `YYYY-MM-DD-` prefix: the date drives the
`/:year/:month/:day/` part of the URL, and the rest of the filename is the
slug. Every post carries an explicit `slug:` in its front matter so URLs
never drift from the title.
