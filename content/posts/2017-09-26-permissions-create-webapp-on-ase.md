---
layout: post
category: Azure
title: Permissions needed to create a Web App on an ASE
tags:
- Azure
- AppService
- AppServiceEnvironment
comments: []
---
Documenting this here in case I run into this again. While working with a customer that is taking
advantage of [App Service Environment](https://docs.microsoft.com/en-us/azure/app-service/environment/intro)
to host internal applications on Azure with connectivity to their Express Route connection, we ran
into an issue when trying to setup permissions so that selected users could create new Web Apps
on an existing App Service Plan on the ASE.

For App Service Environment v1, it appears the easiest way to setup the right permissions are:

* Grant the `Reader` role on the App Service Environment itself.
* Grant the `Web Plan Contributor` role on the App Service Plan.
* Grant the `Web Site Contributor` role on the resource group you will create the Web App on.

I was a little concerned about granting the `Web Plan Contributor` role as it grants way too many
permissions on the App Service Plan (ASP), but on v1, this is not so much of an issue as there is no
direct monetary impact from the ASP.

I did try setting up a custom role instead, and the least permissions I was able to test that still
worked were:

```text
Microsoft.Authorization/*/read
Microsoft.Insights/alertRules/*
Microsoft.Insights/components/*
Microsoft.ResourceHealth/availabilityStatuses/read
Microsoft.Resources/deployments/*
Microsoft.Resources/subscriptions/resourceGroups/read
Microsoft.Support/*
Microsoft.Web/certificates/*
Microsoft.Web/listSitesAssignedToHostName/read
Microsoft.Web/deploymentLocations/read
Microsoft.Web/serverFarms/read
Microsoft.Web/serverFarms/*/read
Microsoft.Web/serverFarms/write
Microsoft.Web/sites/*
```

This is not much of an improvement, since it appears you still require `write` permissions on the
App Service Plan, but it was still interesting to test.

This has changed for App Service Environment v2, so I can't comment on that.