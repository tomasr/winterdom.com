---
layout: post
category: Azure
title: Creating Event Grid Subscriptions
tags:
- Azure
- ARM
- EventGrid
comments: []
---
A [few days ago]({% post_url 2017-08-17-eventgrid-webhook-arm-template %}), I wrote about using
Azure Resource Manager (ARM) templates to deploy Azure [Event Grid](https://docs.microsoft.com/en-us/azure/event-grid/overview).
That sample showed how to create a new Event Grid Topic resource. This basically gives you
an URL you can publish custom events to and have them routed to one or more event subscribers.

However, one of the very powerful features in Event Grid is not custom topics, but subscribing
to events published by the Azure fabric itself; that is, events published by Resource Manager
Providers. As of these writings, only a few providers support Event Grid, but this number is sure
to grow in the coming months.

## Supported Event Publishers

What Azure resource manager providers support Event Grid? An easy way to find this out
is to ask Azure itself. To do this, we can leverage the excellent
[ArmClient](https://github.com/projectkudu/ARMClient) tool. Resource Managers that support
publishing events through Event Grid are called __Topic Types__, and we can query these:

```sh
armclient get /providers/Microsoft.EventGrid/topicTypes?api-version=2017-06-15-preview
```

If the command succeeds, we should see something like this:

```json
{
  "value": [
    {
      "properties": {
        "provider": "Microsoft.Eventhub",
        "displayName": "EventHubs Namespace",
        "description": "Microsoft EventHubs service events.",
        "resourceRegionType": "RegionalResource",
        "provisioningState": "Succeeded"
      },
      "id": "providers/Microsoft.EventGrid/topicTypes/Microsoft.Eventhub.Namespaces",
      "name": "Microsoft.Eventhub.Namespaces",
      "type": "Microsoft.EventGrid/topicTypes"
    },
    ...
  ]
}
```

Knowing what event publishes exists is only half the story, though. We also want to
know what type of events a publisher supports. These are called __Event Types__ in
Event Grid, and we can query those as well.

For example, let's say we want to find out events supported by the `Microsoft.Resources.ResourceGroups`
topic type:

```sh
armclient get /providers/Microsoft.EventGrid/topicTypes/Microsoft.Resources.ResourceGroups/eventTypes?api-version=2017-06-15-preview
```

If the command succeeds, we should see an output similar to the following:

```json
{
  "value": [
    {
      "properties": {
        "displayName": "Resource Write Success",
        "description": "Raised when a resource create or update operation succeeds.",
        "schemaUrl": "TBD"
      },
      "id": "providers/Microsoft.EventGrid/topicTypes/Microsoft.Resources.ResourceGroups/eventTypes/Microsoft.Resources.ResourceWriteSuccess",
      "name": "Microsoft.Resources.ResourceWriteSuccess",
      "type": "Microsoft.EventGrid/topicTypes/eventTypes"
    },
    ...
  ]
}
```

Now let's see how we can subscribe to events published by the Azure fabric.

## Event Hub Namespaces

Currently, you can only subscribe to events published at the Event Hub Namespace
level, not an individual Event Hub itself. For this we'd use the `Microsoft.EventHub.Namespaces`
topic type to create a nested resource of type `Microsoft.EventGrid/eventSubscriptions`:

```json
{
    "apiVersion": "2017-06-17-preview",
    "name": "[concat(parameters('eventHubNamespaceName'), '/Microsoft.EventGrid/', parameters('subscriptionName'))]",
    "type": "Microsoft.EventHub/namespaces/providers/eventSubscriptions",
    "tags": {
        "displayName": "Webhook Subscription"
    },
    "dependsOn": [
        "[concat('Microsoft.EventHub/Namespaces/', parameters('eventHubNamespaceName'))]"
    ],
    "properties": {
        "destination": {
            "endpointType": "WebHook",
            "properties": {
                "endpointUrl": "[parameters('webhookUrl')]"
            }
        },
        "filter": {
            "includedEventTypes": [ "All" ],
            "subjectBeginsWith": "",
            "subjectEndsWith": "",
            "subjectIsCaseSensitive": false
        }
    }
}
```

Notice that the `type` property has the format `<parent_resource_type>/providers/<child_resource_type>`
as is standard practice in ARM Templates. The `name` property would then start with the
name of the parent resource (the Event Hub Namespace, in this case), followed by '/Microsoft.EventGrid/`
and the name of the new resource representing the event grid subscription.

## Resource Groups

The `Microsoft.Resources.ResourceGroups` topic type publishes events on management operations
on a resources in an specific resource group. Using ARM, we'd create this as a top-level
resource on the template resource group:

```json
{
    "apiVersion": "2017-06-15-preview",
    "name": "[parameters('subscriptionName')]",
    "type": "Microsoft.EventGrid/eventSubscriptions",
    "tags": {
        "displayName": "Webhook Subscription"
    },
    "properties": {
        "destination": {
            "endpointType": "WebHook",
            "properties": {
                "endpointUrl": "[parameters('webhookUrl')]"
            }
        },
        "filter": {
            "includedEventTypes": [ "All" ],
            "subjectBeginsWith": "",
            "subjectEndsWith": "",
            "subjectIsCaseSensitive": false
        }
    }
}
```

## Subscriptions

The `Microsoft.Resources.Subscriptions` topic type publishes events on management operations
on an entire Azure subscription. This is a more interesting scenario, because an event subscription
at the Azure-subscription level (pardon the redundancy) is a global resource itself that doesn't
belong to a resource group.

Unforunately, I have been unable to find a magical incantation that can create such a resource
on an ARM template, since an ARM deployment is always done on a resource group. I do hope there
is a way to do this, as otherwise automating a solution will be a bit harder.

Anyway, creating one using ArmClient is quite possible. To do this, first create a text file
with the right JSON content. For example:

```json
{
  "properties": {
    "destination": {
      "endpointType": "WebHook",
      "properties": {
        "endpointUrl": "https://requestb.in/1i0mp2v1"
      }
    },
    "filter": {
      "includedEventTypes": [ "All" ],
      "subjectBeginsWith": "",
      "subjectEndsWith": "",
      "subjectIsCaseSensitive": false
    }
  }
}
```

Then use `ArmClient` to create global resource. To do this, you will need the Azure `subscrition_id`,
the `name` you want to provide to your Event Grid event subscription, and the path of the JSON `file`
created in the previous step:

```sh
armclient put /subscriptions/<subscription_id>/providers/Microsoft.EventGrid/eventSubscriptions/<name>?api-version=2017-06-15-preview @<file>
```

## Conclusion

Hopefully, this article gives you a few ideas on how to work with Event Grid and
how to automate creating event grid event subscriptions for different Azure Resources.