---
layout: post
category:
- Visual Studio
title: Updating Viasfora Themes
tags:
- Viasfora
- VisualStudio
- VSIX
comments: []
---
A few days ago, I wrote about [Themes coming to Viasfora]({% post_url 2017-07-29-viasforathemes %}) in v3.6.
One of the issues that some users will face is that I had to make a breaking change to fix something I
was unhappy about for a long time: The classification names used by Viasfora were very inconsistent.

Renaming classification names means that when you update from v3.5 to v3.6, you will lose any customizations
made to editor colors used by Viasfora. You can customize everything by hand again, but this can be very annoying.
[Ewen Wallace](https://github.com/CADbloke) noticed this [yesterday](https://github.com/tomasr/viasfora/issues/211).

So to minimize the impact of having to go to this, I made a simple PowerShell script that can help you when upgrading.
You can find the full code for the script in a GitHub [gist](https://gist.github.com/tomasr/e7c2cc99eded6f970ec4f4c9d7a64b43).

To use this script and migrate your custom colors, do the following:

* In Visual Studio, use the `Tools` -> `Import and Export Settings` menu option.
* Select the default `Export selected environment settings` option.
* Deselect everything, and only mark Options / Environment / Fonts and Colors
* Select the destination file name and export your settings.

Once you've exported your settings to a `.vssettings` file, download the [PowerShell Script](https://gist.github.com/tomasr/e7c2cc99eded6f970ec4f4c9d7a64b43), and save it as a `.PS1` file.

* Open a new PowerShell console
* Execute the script like this:

```ps1
.\Convert-ViasforaTheme.ps1 -VSSettings "path_to_vssettings_file" -ThemeFile "path_to_new_theme_file"
```

The result will be a JSON file that you can then import into Viasfora from the `Tools` -> `Options` ->
`Viasfora` -> `Import/Export`.



