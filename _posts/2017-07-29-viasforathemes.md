---
layout: post
category: VisualStudio
title: Viasfora Themes and Settings in v3.6
tags:
- Viasfora
- VisualStudio
- VSIX
---
With the release of [Viasfora](http://viasfora.com/) v3.6 in the following days,
there are two new features coming up:

![Import / Export settings](http://static.winterdom.com/images/2017/vsf-export.png)

* Exporting/Importing the current settings. Generally speaking, you can always just copy the `Viasfora.xml` settings file, but this provides a more straight implementation.
* Exporting your current Viasfora color settings as a "Theme" that you can share or move to a new computer. 

Despite sounding relatively simple, getting these two features working
required quite a bit of work, as I had to do major refactoring of some code.
However, I'm somewhat happy about the end result!

Themes are obviously the most interesting of the two. These are simple JSON
files that contains a list of each of the supported editor formats
in Viasfora. For each one, it contains:
* The foreground color
* The background color
* The font styles (None, Bold)

Documentation for themes is already available on the [wiki](https://github.com/tomasr/viasfora/wiki/Themes).

If people start using this feature more often, I'd be open to creating
a new repository to host theme files and sharing a few.
