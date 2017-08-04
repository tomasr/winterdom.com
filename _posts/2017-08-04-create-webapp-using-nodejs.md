---
layout: post
category: Azure
title: Creating an Azure WebApp through ARM and Node.js
tags:
- Azure
- AppService
- Node.js
comments: []
---
I recently [posted an article]({% post_url 2017-08-01-aiarm %}) on how to create
an Azure WebApp on AppService with an associated Application Insights resource
using Azure Resource Manager (ARM) templates.

I've been playing the past couple of days with the [Azure SDK for Node.js](https://github.com/Azure/azure-sdk-for-node),
and thought I'd write how to accomplish the same thing through code. Let's recap
what we want to create from our previous article:

* Create a new resource group
* Create an Application Insights resource
* Create a new App Service Plan
* Create a new WebApp on this ASP
* Configure the AppInsights InstrumentationKey as an `appSettings`
* Deploy the Application Insights site extension

Our first step using the SDK is to import the `ms-rest-azure` package and 
login to our Azure account using an interactive login:

```js
const MsRest = require('ms-rest-azure');
// ...
login() {
    return MsRest.interactiveLogin({ domain: this.tenantId });
}
```

This will give us a `credentials` object we can use later for the rest of the calls.
Once this is successful, we can use the `azure-arm-resource` package to create the
resource group. All we need to specify is the name of the new resource group,
and the Azure region we want to use:

```js
const ResourceManagement = require('azure-arm-resource');
// ...
createResourceGroup(resourceInfo) {
    let group =  {
        location: this.location
    };
    let rgmanagement = new ResourceManagement.ResourceManagementClient(resourceInfo.credentials, this.subscriptionId);
    return rgmanagement.resourceGroups.createOrUpdate(this.resourceGroupName, group)
}
```

The next step is to create a new Application Insights resource in our resource group.
Like in our ARM template sample, we want to provision a tag that will later link
it to the WebApp once we create it. The `azure-arm-insights` package, unfortunately,
does not support managing `components` resources, so we need to use the
generic `azure-arm-resources` package to create a new resource of type
`microsoft.insights/components':

```js
createAppInsights(resourceInfo) {
    let envelope = {
        location: this.location,
        properties: {},
        tags: {
        }
    };
    let webAppId = `${resourceInfo.resourceGroup.id}/providers/Microsoft.Web/sites/${this.webAppName}`
    envelope.tags[`hidden-link:${webAppId}`] = 'Resource';

    let management = new ResourceManagement.ResourceManagementClient(resourceInfo.credentials, this.subscriptionId);
    return management.resources.createOrUpdate(
        this.resourceGroupName, // resource group
        'microsoft.insights',   // provider namespace
        '',                     // parent resource
        'components',           // resource type
        this.appInsightsName,   // resource name
        '2014-04-01',           // api version
        envelope);
}
```

We can now create the App Service Plan and the WebApp using the
`azure-arm-website` package. Creating the ASP is relatively
straightforward; we just need the name, location, tier and capacity.
Creating the application takes a little bit more work, and for this
we will need:

* The ID of the App Service Plan created
* The object returned by our previous step to get the `InstrumentationKey` of the Application Insights resource:

```js
const WebAppManagementClient = require('azure-arm-website');
// ...
createHostingPlan(resourceInfo) {
    var info = {
        location: this.location,
        sku: {
            name: this.webPlanTier,
            capacity: this.webPlanCapacity
        }
    };
    let wam = new WebAppManagementClient(resourceInfo.credentials, this.subscriptionId);
    return wam.appServicePlans.createOrUpdate(this.resourceGroupName, this.webPlanName, info);
}

createWebApp(resourceInfo) {
    var envelope = {
        name: this.webAppname,
        location: this.location,
        kind: 'web',
        serverFarmId: resourceInfo.webHostingPlan.id,
        properties: {
        },
        siteConfig: {
            appSettings: [
                {
                    name: 'APPINSIGHTS_INSTRUMENTATIONKEY', 
                    value: resourceInfo.appInsights.properties.InstrumentationKey
                }
            ]
        }
    };
    let wam = new WebAppManagementClient(resourceInfo.credentials, this.subscriptionId);
    return wam.webApps.createOrUpdate(this.resourceGroupName, this.webAppName, envelope);
}
```

Our final step is to deploy the Application Insights site extension onto our new WebApp.
There doesn't seem to be support in the `azure-arm-website` package to create
site extensions, so again we will use the `azure-arm-resource` package
to create it as a generic resource. This takes a little bit more work
as we need to specify the WebApp as the 'parent' resource:

```js
addAppInsightsExtension(resourceInfo) {
    var envelope = {
        location: this.location,
        properties: {}
    };
    let management = new ResourceManagement.ResourceManagementClient(resourceInfo.credentials, this.subscriptionId);
    return management.resources.createOrUpdate(
        this.resourceGroupName,                         // resource group
        'Microsoft.Web/sites',                          // provider namespace
        this.webAppName,                                // parent resource
        'siteextensions',                               // resource type
        'Microsoft.ApplicationInsights.AzureWebSites',  // resource name
        '2015-08-01',                                   // api version
        envelope);
}
```

## Conclusion

Here we saw how we can leverage the Azure SDK for Node to automate the creation
of Azure resources. In this case, we covered a common scenario of deploying
a Web application on AppService with Application Insights.

This was also a good way to get a little bit more into Node and JavaScript,
so it's probably a bit clunky. Any good feedback or suggestions would sure
be welcome!

You can find the complete code [here](https://github.com/tomasr/node-create-azure-webapp-sample).