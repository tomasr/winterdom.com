---
layout: post
category: Visual Studio
title: Viasfora v4.0 Update
tags:
- VisualStudio
- Viasfora
- VSIX
comments: []
---
For the past few months, I've been slowly improving my Visual Studio Extension, [Viasfora](https://viasfora.com).
Version 4.0 was recently released, and besides regular bug fixes and some much needed refactoring,
I also implemented a brand new feature: __Rainbow Lines__.

![Rainbow Lines]({{site.images_base}}/2018/rainbow-lines.gif)

For now, this feature is disabled by default, while I iron out all kinks and ensure it has the
best possible performance. If you're a Viasfora user, and like the feature, please do give it
a try and let me know any feedback!

Implementing this feature was interesting. Getting the right locations and handling caret movement
was relatively straightforward, particularly since it relies on the same logic that was already present
to support the Rainbow Highlight feature. Drawing the lines, however, was far trickier.

The largest complexity here is the fact that the Visual Studio Text Editor doesn't have layout information
for all lines; just for those that are currently visible. So when the line containing the opening brace
or closing brace is not visible, figuring out the right place to draw the lines can get tricky.

Still, I think the end result is pretty decent, particularly considering the tricks for handling
scrolled views, such as this:

![Rainbow Lines Scrolled View]({{site.images_base}}/2018/rainbow-lines-2.png)

Of course, it's not perfect. For example, since Viasfora does not do lexical analysis, sometimes
the lines will not align perfectly with Visual Studio's structure guides:

![Rainbow Lines on wrong column]({{site.images_base}}/2018/rainbow-lines-3.png)

## Themes

Version 3.6 introduced the concept of themes. These are simple JSON files that contain
all the color information for the text editor classifications in Viasfora.

You can export your current configuration as a new theme, or import an existing one.
I don't think many people have been using this, but if you have customized the Viasfora
color configuration extensively, I'd love to see what you've done with it and what works for you.

In the meantime, I've shared the theme I'm currently using for Rainbow Braces
[here](https://github.com/tomasr/viasfora/blob/master/themes/dark-light-braces.json), and it
works pretty nicely on the Visual Studio dark theme:

![Rainbow dark-light-braces theme]({{site.images_base}}/2018/rainbow-dark-theme.png)

## Version 4.1

Since the v4.0 release, I've continued improving Viasfora, and version 4.1 should be coming up soon. It
contains a few improvements to Rainbow Lines, but the biggest change by far was required to support
changes in how Visual Studio loads extension packages.

Recently, the product team announced that Visual Studio 2017 version 15.8, Visual Studio would start
alerting users when loading synchronous packages that are configured to auto load (via the `[ProvideAutoLoad]`
attribute), and a later version would completely disable support for this.

Of course, Viasfora was one of the affected extensions, since it was configured to auto-load when
the Text Editor is displayed the first time. Though the Viasfora package did very little initialization and
was generally quite fast, it would be subject to the same rules as any other package.

Not wanting this to cause any issues, I set up to change this, which lead to a
significant [refactoring](https://github.com/tomasr/viasfora/commit/975524186044ce5ef07b3755f5114476f55d6255)
of the code. Converting the package to an `AsyncPackage` did not seem possible
without dropping support for VS2012, but I was able to completely remove the need to auto-load
the package with only a minor loss of functionality.