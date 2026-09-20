---
layout: post
category: Azure
title: Creating an Event Hub destination using Event Grid in ARM
tags:
- Azure
- ARM
- EventGrid
- EventHubs
comments: []
---
In a previous [post]({% post_url 2017-08-21-creating-eventgrid-subscriptions %}), I presented a
few ways to create [Azure Event Grid](https://docs.microsoft.com/en-us/azure/event-grid/overview)
resources using Azure Resource Manager (ARM) templates.

Today, support for sending grid events to [Azure Event Hubs](https://docs.microsoft.com/en-us/azure/event-hubs/event-hubs-what-is-event-hubs)
rather than to an HTTP-based WebHook was [announced](https://azure.microsoft.com/en-us/blog/azure-event-grid-now-supports-event-hubs-as-a-destination/).
Obviously, I wanted to try this out as quick as possible!

Since using ARM to automate deployment is something I find very useful, I looked at how an Event Hubs
destination would be created through this mechanism. Here's a sample ARM template that creates a new
event subscription on an Azure Resource Group (to get resource events) and routes all events to an existing
Azure Event Hub:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "subscriptionName": {
      "type": "string",
      "minLength": 1
    },
    "eventHubNamespace": {
      "type": "string",
      "minLength": 1
    },
    "eventHubName": {
      "type": "string",
      "minLength": 1
    },
    "eventHubResourceGroup": {
      "type": "string",
      "minLength": 1
    }
  },
  "variables": {
    "eventHubId": "[resourceId(parameters('eventHubResourceGroup'), 'Microsoft.EventHub/namespaces/eventHubs', parameters('eventHubNamespace'), parameters('eventHubName'))]"
  },
  "resources": [
    {
      "apiVersion": "2017-09-15-preview",
      "name": "[parameters('subscriptionName')]",
      "type": "Microsoft.EventGrid/eventSubscriptions",
      "tags": {
          "displayName": "Hub Subscription"
      },
      "properties": {
          "destination": {
              "endpointType": "EventHub",
              "properties": {
                  "resourceId": "[variables('eventHubId')]"
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
  ],
  "outputs": { }
}
```

This is almost the same as creating a Webhook-based subscription, with two minor differences:

* The `endpointType` property is set to `EventHub` rather than `Webhook`.
* The properties of the destination contains a `resourceId` property that has the Id of the
  Event Hub you want to send events to, rather than the usual `endpointUrl` used for WebHooks.

This is a very useful addition to the Event Grid service which enables some interesting scenarios
such as:

* Archiving of events: For example, if I had an Event Grid custom topic, I could add a new Event Hub destination
  and enable the [Capture](https://docs.microsoft.com/en-us/azure/event-hubs/event-hubs-capture-overview)
  feature on the hub to easily archive every event coming into the topic at scale.
* Delayed/batch processing of events.
* Stream processing of events, by using Stream Analytics to process events through the hub.
