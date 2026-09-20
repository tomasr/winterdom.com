---
layout: post
category: Azure
title: Deploying an Event Grid + WebHook with ARM
tags:
- Azure
- ARM
- WebHooks
comments: []
---
Azure [Event Grid](https://docs.microsoft.com/en-us/azure/event-grid/overview) was announced
a couple of days ago for building event-driven architecture. While the initial preview is a bit limited
in the number of supported event publishers, it has tons of promise and I was immediately
intrigued by the possibilities!

Being a fan of Azure Resource Manager templates, I soon tried to figure out how you could
automate the creation of Event Grid resources. After some trial and error and some
research, I was able to come up with an initial template to create:

* An Event Grid topic resource
* A WebHook-based event subscription.

You can find the complete sample template [here](https://github.com/tomasr/arm-eventgrid-webhook).

The sample template first declares some simple parameters and variables:

```json
{
    "parameters": {
        "eventGridName": {
            "type": "string",
            "minLength": 1
        },
        "webhookName": {
            "type": "string",
            "minLength": 1
        },
        "webhookUrl": {
            "type": "string",
            "minLength": 1
        },
        "webhookEventTypes": {
            "type": "array",
            "defaultValue": [ "All" ]
        },
        "webhookPrefixFilter": {
            "type": "string",
            "defaultValue": ""
        },
        "webhookSuffixFilter": {
            "type": "string",
            "defaultValue": ""
        },
        "webhookCaseSensitive": {
            "type": "bool",
            "defaultValue": false
        },
        "webhookLabels": {
            "type": "array",
            "defaultValue": [ "" ]
        }
    },
    "variables": {
        "apiVersion": "2017-06-15-preview"
    }
}
```

Creating the Event Grid topic is relatively simple; it's a resource of type `Microsoft.EventGrid/topics`.
We just need to supply the right API version (2017-06-15-preview in this release), the grid name,
and one of the supported Azure regions:

```json
{
    "apiVersion": "[variables('apiVersion')]",
    "name": "[parameters('eventGridName')]",
    "type": "Microsoft.EventGrid/topics",
    "location": "[resourceGroup().location]",
    "tags": {
        "displayName": "EventGrid"
    },
    "properties": {
        "name": "[parameters('eventGridName')]"
    }
}
```

Creating the WebHook subscription took a bit of work to figure out. Eventually realized
this needed to be a nested resource of type `Microsoft.EventGrid/topics/providers/eventSubscriptions`,
and it needed a special name in the pattern `<EventGridName>/Microsoft.EventGrid/<WebHookName>`. You
can then specify the WebHook URL, and the filter of which events you want delivered to it:

```json
{
    "apiVersion": "[variables('apiVersion')]",
    "name": "[concat(parameters('eventGridName'), '/Microsoft.EventGrid/', parameters('webhookName'))]",
    "type": "Microsoft.EventGrid/topics/providers/eventSubscriptions",
    "tags": {
        "displayName": "Webhook Subscription"
    },
    "dependsOn": [
        "[concat('Microsoft.EventGrid/topics/', parameters('eventGridName'))]"
    ],
    "properties": {
        "destination": {
            "endpointType": "WebHook",
            "properties": {
                "endpointUrl": "[parameters('webhookUrl')]"
            }
        },
        "filter": {
            "includedEventTypes": "[parameters('webhookEventTypes')]",
            "subjectBeginsWith": "[parameters('webhookPrefixFilter')]",
            "subjectEndsWith": "[parameters('webhookSuffixFilter')]",
            "subjectIsCaseSensitive": "[parameters('webhookCaseSensitive')]"
        },
        "labels": "[parameters('webhookLabels')]"
    }
}
```

End result of applying the template in the portal shows are hook created correctly:

![WebHook in Azure Portal]({{site.images_base}}/2017/eg-webhook.png)

I also added some outputs to the ARM template so that it returns the topic endpoint URL
of the created Event Grid, as well as the first access key:

```json
"outputs": {
    "eventGridUrl": {
        "type": "string",
        "value": "[reference(parameters('eventGridName')).endpoint]"
    },
    "eventGridKey": {
        "type": "string",
        "value": "[listKeys(resourceId('Microsoft.EventGrid/topics', parameters('eventGridName')), variables('apiVersion')).key1]"
    }
}
```

Something I did notice while testing this is that it appears that, in the current
implementation, some properties of the event subscription cannot be updated after it
has been created. Hopefully this restriction is eventually lifted, as it makes it a bit
harder to support continuous integration with ARM, but if not, you'd need to first drop
the webhook and create it again.