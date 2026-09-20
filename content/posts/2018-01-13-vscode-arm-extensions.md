---
layout: post
category:
  - Visual Studio
title: ARM Extensions for Visual Studio Code
tags:
- Azure
- VisualStudio
comments: []
---
I've mentioned before that [Visual Studio Code](https://code.visualstudio.com/) has been my
tool of choice lately for writing Azure Resource Manager (ARM)
[templates](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authoring-templates).

I'd like to mention some reasons I've found this a great combination:

* VSCode is far more lightweight than the full Visual Studio.
* I've always found the deployment experience for ARM templates in Visual Studio to be a bit clunky
* Deploying ARM templates from the command line using the Azure CLI provides a great experience,
  and it is now my option of choice when testing.

There are some specific extensions that I've found useful for editing ARM templates:

* Of course, the [Azure Resource Manager Tools](https://marketplace.visualstudio.com/items?itemName=msazurermtools.azurerm-vscode-tools) is mandatory, as it provides all the base editing experience.
* The [Azure Resource Manager Snippets](https://marketplace.visualstudio.com/items?itemName=samcogan.arm-snippets) extension by Sam Cogan is pretty good, and provides tons of useful snippets for a lot of common resource types.
* The [Azure ARM Template Helper](https://marketplace.visualstudio.com/items?itemName=ed-elliott.azure-arm-template-helper) extension by Ed Elliot, which I just very recently discovered, provides functionality close to the bit I miss the most from Visual Studio: The JSON tree view of the template.
  Only Ed's version goes beyond resources, and provides more extensive navigation:

  ![ARM Template Outline]({{site.images_base}}/2018/arm-outline.png)
  
  My only comment on this excellent extension, is that it would be useful if you didn't need to explicitly run
  the `ARM: Start Outliner` command to enable it. 

And of course, JSON is unreadable without some nice Rainbow Braces support. I'm currently using
the [Bracket Pair Colorizer](https://marketplace.visualstudio.com/items?itemName=CoenraadS.bracket-pair-colorizer) extension for this.