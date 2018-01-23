---
layout: post
category: Azure
title: Azure API Management - Changing the Subscription Key header or query string names 
tags:
- Azure
- APIManagement
comments: []
---
By default, there are two ways a consumer can specify the `Subscription Key` on a call
to API Management:

* Using the `Ocp-Apim-Subscription-Key` HTTP header
* Using the `subscription-key` query string value in the URL

These are just the default names for both. While they can be customized, it can be non-obvious
how to do this, since it is not exposed directly in the user interface in the Publisher or the
Azure Portals.

Both of these options are part of the definition of the ARM resource for the API (yes, APIs, Products,
and other API Management entities are essentially nested ARM resources within the API management instance):

![API properties]({{site.images_base}}/2018/apim-keys-1.png)

There are a few easy ways you can customize this:

## Using PowerShell

If you're comfortable using the PowerShell Azure cmdlets, then it's possible to change these properties
using the `Set-AzureRmApiManagementApi` cmdlet. For example, let's change the header name
to `ApiKey` and the query string value name to `api-key`:

```powershell
$apim = New-AzureRmApiManagementContext -ResourceGroupName $resourceGroup -ServiceName $resourceName
$echoApi = Get-AzureRmApiManagementApi -Context $apim -ApiId 'echo-api'
Set-AzureRmApiManagementApi -Context $apim `
                            -ApiId $echoApi.ApiId `
                            -Name $echoApi.Name `
                            -ServiceUrl $echoApi.ServiceUrl `
                            -Protocols $echoApi.Protocols `
                            -SubscriptionKeyHeaderName 'ApiKey' `
                            -SubscriptionKeyQueryParamName 'api-key'
```

This is a bit more annoying than it should be, because `Set-AzureRmApiManagementApi` has the
`ApiId`, `Name`, `ServiceUrl`, and `Protocols` parameters marked as mandatory, so we need to provide
a value even if we're not trying to change any of them. Simplest way around this is to first query
the current values and pass them back when modifying the API definition.

## Using the REST API

Another option is to use any tool that can be used to call REST APIs, if you have the management REST API
in API Management enabled.

To do this, first get an access token for the service using the Azure Portal or the publisher portal.

Here, I'll use [Postman](https://www.getpostman.com/) to change the properties:

![Using Postman]({{site.images_base}}/2018/apim-keys-4.png)

## Using the Azure Portal?

At this point, it does not appear to be a way to change these options from the Azure Portal.
The new experience for editing APIs is quite nice, and you can check the current values using
the following process:

* Select the API you want to modify
* Make sure the __Design__ tab is selected
* Click on the pencil icon next to the __Frontend__ section to edit the raw API definition
  ![Edit Frontend]({{site.images_base}}/2018/apim-keys-2.png)
* You will see a YAML definition for the API, including a `securityDefinitions` section where
  the names of the header and query string value are defined.

![Using the portal]({{site.images_base}}/2018/apim-keys-3.png)

While you can modify these settings here, and then save the API definition, the changes appear to be
ignored, so it's not, currently, a viable alternative.