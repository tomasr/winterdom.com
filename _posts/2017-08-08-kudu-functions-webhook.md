---
layout: post
category: Azure
title: Using Azure Functions to create AppInsights release annotations
tags:
- Azure
- AppService
- AzureFunctions
- ApplicationInsights
- WebHooks
comments: []
---
I recently had the opportunity to discuss with a customer one cool feature in Application Insights:
[Release Annotations](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-annotations).

As the article above shows, you can easily create Release Annotations using Visual Studio Team Services
release pipelines. In this post, I'd like to provide an alternative way to implement release annotations
for applications hosted on Azure App Service, by using the [WebHooks support](https://github.com/projectkudu/kudu/wiki/Web-hooks)
in Kudu, and Azure Functions.

## Context

Let's assume that you already have a Web application deployed to a Azure App Service, and have hooked up
some sort of automated deployment story. For example, you may be using the
[local git](https://docs.microsoft.com/en-us/azure/app-service-web/app-service-deploy-local-git) repository
to deploy a new version of your app through a `git push` command.

Let's also assume you already have an Application Insights resource you're using to monitor this application.

## Step 1: Obtain Application Key

The first step in automating the creation of release annotations is going to be to prepare our
Application Insights resource by obtaining a new Application Key. We can do this from the Azure Portal,
by finding our Application Insights resource, and selecting the __API Access__ option on the left-hand
menu:

* Press the __Create API key__ option at the top-left.
* Provide a description for your new key (such as "Create Annotations").
* Select the "Write annotations" permission.
* Press the "Generate key" button.

![Create a new API key]({{site.images_base}}/2017/ai-create-api-key.png)

Once the key has been generated, copy the value. If you don't, you'll have to create a brand new
key! Also, note the __Application ID__ value for your Application Insights resource, displayed
alongside your new API key. We will need both to create a new annotation later on.

## Step 2: Create the Function App

Create a brand new Function App in your Azure Subscription. For this demo, I'll create
a new one in a __Consumption Plan__:

![Create a new Function App]({{site.images_base}}/2017/ai-new-function.png)

Now, create a new Function. For simplicity, I'm going to use the "Webhook + API" template
in JavaScript:

![Add new function]({{site.images_base}}/2017/ai-function-hook.png)

The request sent by Kudu is going to contain some useful properties for our new function:

* __id:__ the deployment ID.
* __siteName:__ The name of our Web App. You could use this, for example,
    to have a single function support deployments for multiple applications.
* __message:__ the deployment message. For a Git-based deployment, this could be part of the commit message.
* __authorEmail:__ For Git-based deployment, this would be the author of the last commit.

You can find a complete list of the properties [here](https://github.com/projectkudu/kudu/wiki/Web-hooks#user-content-hook-request-fired-by-the-kudu-service).

Creating the release annotation requires a few things besides the Application Insights
application id and key:

* The name you want to give to the release annotation. We'll use a combination of the site name
    and the deployment ID.
* The time the release happened. We'll just use the current date/time.
* A list of arbitrary properties: We'll store the commit message, as well as the author.

Our function code would look something like this:

```js
var request = require('request');

module.exports = function (context, req) {

    var deploymentId = req.body.id;
    var siteName = req.body.siteName;
    var releaseName = siteName + '_' + deploymentId;
    var appId = process.env.APPINSIGHTS_APPID;
    var apiKey = process.env.APPINSIGHTS_APIKEY;

    var releaseProperties = {
        ReleaseName: releaseName,
        Message: req.body.message.trim(),
        By: req.body.authorEmail
    };

    context.log('Creating a new release annotation: ' + releaseName);

    var body = {
        Id: deploymentId,
        AnnotationName: releaseName,
        EventTime: (new Date()).toISOString(),
        Category: 'Deployment',
        // the Properties part contains a JSON object as a string
        Properties: JSON.stringify(releaseProperties)
    };
    var options = {
        url: 'https://aigs1.aisvc.visualstudio.com/applications/' 
           + appId + '/Annotations?api-version=2015-11',
        method: 'PUT',
        headers: {
            'X-AIAPIKEY': apiKey
        },
        body: body,
        json: true
    };
    context.log('Sending request to: ' + options.url);
    context.log(JSON.stringify(body));

    request(options, function(error, response, body) {
        if ( error ) {
            context.log(error);
            context.res = {
                status: 500,
                body: err
            };
            context.done();
        } else {
            context.log("Response: " + response.statusCode + " - " + JSON.stringify(body));
            context.res = {
                status: response.statusCode,
                body: body
            };
            context.done();
        }
    });
};
```

We also need to configure our Application Insights application id and application key. To avoid
hardcoding these on the code, let's create them as application Settings:

![Application Settings]({{site.images_base}}/2017/ai-function-settings.png)

Finally, since we're using the `require` package, we also need to add a `package.json` file
as described [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#node-version-and-package-management).
In our case, contents would be simple, like:

```json
{
    "name": "hooksappcreator",
    "version": "0.0.1",
    "dependencies": {
        "request": "*"
    }
}
```

## Step 3: Configure the Webhook

Now that we have our function app all setup, we need to register the Webhook with Kudu.
Before we can do that, though, we need to obtain the key used to control access
to our Function. To do this, in the portal, select the __Manage__ option for the function,
and then either use the value of the default key, or create a new one:

![Function key]({{base.images_base}}/2017/ai-function-keys.png)

Take a note of the value of the key; we'll use it in a bit (note that the
`</> Get function URL` link on the function editor also gives you the full URL + key).

Now, we need to open up Kudu for our Web App, by navigating to `https://<app_name>.scm.azurewebsites.net/`.
In Kudu, selct the Tools -> Web hooks option from the top-level navigation menu. Now, create a new hook
with the following settings:

* Subscriber URL: We build this out of the Function App name, the Function name, and your Function key:
  `https://<function_app>.azurewebsites.net/api/<function_name>?code=<function_key>`
* Select this as a PostDeployment hook.
* Press the __Add Url__ button to create the hook.

![Webhook in Kudu]({{site.images_base}}/2017/ai-kudu-hook.png)

## Step 4: Testing the Webhook

Once the webhook is registered, we should be ready to test it! Do a new deployment,
and watch the log for the Azure Function. If the call is successful, you should
see something like this in the log:

```
2017-08-08T19:49:29.036 Creating a new release annotation: hooksapp1_e62d8c4eb609de8374fcfae20ebb6d9f09d3ce3c
2017-08-08T19:49:29.052 Sending request to: https://aigs1.aisvc.visualstudio.com/applications/030fb56a-900f-4e24-b058-a8680fbb5f32/Annotations?api-version=2015-11
2017-08-08T19:49:29.052 {"Id":"e62d8c4eb609de8374fcfae20ebb6d9f09d3ce3c","AnnotationName":"hooksapp1_e62d8c4eb609de8374fcfae20ebb6d9f09d3ce3c","EventTime":"2017-08-08T19:49:29.052Z","Category":"Deployment","Properties":"{\"ReleaseName\":\"hooksapp1_e62d8c4eb609de8374fcfae20ebb6d9f09d3ce3c\",\"Message\":\"Updating title\",\"By\":\"tomas@winterdom.com\"}"}
2017-08-08T19:49:29.897 Response: 200 - [{"AnnotationName":"hooksapp1_e62d8c4eb609de8374fcfae20ebb6d9f09d3ce3c","Id":"e62d8c4eb609de8374fcfae20ebb6d9f09d3ce3c","Category":"Deployment","Properties":"{\"ReleaseName\":\"hooksapp1_e62d8c4eb609de8374fcfae20ebb6d9f09d3ce3c\",\"Message\":\"Updating title\",\"By\":\"tomas@winterdom.com\"}","EventTime":"2017-08-08T19:49:29.052+00:00","RelatedAnnotation":null}]
2017-08-08T19:49:29.913 Function completed (Success, Id=43021fb6-7166-4e09-be5d-7ab9b9d36e01, Duration=20906ms)
```

In Application Insights, we should also see our Release Annotation appear on charts:

![Release annotations on charts]({{site.images_base}}/2017/ai-annotations.png)