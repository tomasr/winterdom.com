---
layout: post
category: Azure
title: Logic Apps KeyVault Connector - Part 1
tags:
- Azure
- LogicApps
- KeyVault
comments: []
---
Azure Logic Apps now supports writing [custom connectors](https://docs.microsoft.com/en-us/azure/logic-apps/custom-connector-overview), which
are just custom REST APIs for which you can customize the experience so that they feel
like the built-in Logic Apps connectors. I wanted to give try my hand at writing one,
so decided on a simple use case: Writing a connector that provides a way to retrieve
a secret stored in Azure Key Vault.

![Key Vault Connector](http://static.winterdom.com/images/2017/la-getsecret.png)

This part 1 in a series of articles on my experience writing this.

> __Update 2017-10-17:__ A few details on the post have been updated due to me confusing 
> `summary` and `x-ms-summary`.

## Connector Implementation

In this post, I'd like to talk a bit about the connector implementation. I decided to implement
this as an ASP.NET Core 2.0 WebAPI application that uses the `Microsoft.Azure.KeyVault` library
to query the secret information.

For my initial test, all I implemented was two simple operations:

* List available secrets in the selected Key Vault store
* Get the value of a specified secret (for the latest version, or for a specific one)

For the most part, implementation is fairly straightforward, but there are a couple of interesting
things that are worth discussing.

## OpenAPI Extensions

The connector uses the `Swashbuckle` library to generate the OpenAPI (Swagger) description
for the API. A Logic Apps custom connector has an [extended OpenAPI definition](https://docs.microsoft.com/en-us/azure/logic-apps/custom-connector-openapi-extensions)
that includes things such as:

* Operation descriptions
* Additional metadata for object members and operations (such as descriptions)
* Dynamic parameters and schemas

You can either write the connector OpenAPI description by hand and upload it, or start with
a standard definition and then customize it in the Azure Portal. I quickly found out that every
time you point Logic Apps to your updated OpenAPI definition after changes will overwrite
all your customizations, so you'd need to do them all over again.

This makes sense, since the idea is that you'd normally upload an OpenAPI definition that
already contains the necessary extensions, but if not, it quickly gets really annoying.

What I did to simplify this process somewhat was writing a couple of Swashbuckle extensions
to produce at least a working definition right from the start.

For every operation in your connector, you should at least have a `description` and
an `x-ms-summary` field. You'll also want to correctly name your operation as you want it
to appear in the Logic Apps designer by setting the `operationId`.

I ended up writing my operations like this:

```c#
[HttpGet()]
[SwaggerOperation(OperationId = "ListSecrets")]
[Summary("Lists all secrets")]
[Description("Lists the secrets stored in Key Vault")]
public  async Task<IEnumerable<Secret>> Get(String vaultName)
``` 

Notice how I use the `DescriptionAttribute` to specify the longer operation description, and
the `SummaryAttribute` to add the value for `summary`. Both are processed by custom
`IOperationFilter` extensions for `Swashbuckle`. Here's the code for handling the summary:

```c#
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Parameter)]
public class SummaryAttribute : Attribute {
  public String Summary { get; private set; }

  public SummaryAttribute(String summary) {
    this.Summary = summary;
  }
}

public class SummaryFilter : IOperationFilter {
  public void Apply(Operation operation, OperationFilterContext context) {
    var apiDesc = context.ApiDescription;
    var summary = apiDesc.ActionAttributes()
                         .OfType<SummaryAttribute>()
                         .FirstOrDefault();
    if ( summary != null ) {
      operation.Summary = summary.Summary;
    }
  }
}
```

The code for handling the description is very similar to this. All that remained was registering
these extensions during startup, like this:

```c#
services.AddSwaggerGen(c => {
  c.SwaggerDoc("v1", new Info { Title = "KeyVaultController", Version = "v1" });
  c.OperationFilter<SummaryFilter>();
  c.OperationFilter<DescriptionFilter>();
});
```

I've been looking at a similar mechanism for adding support for `x-ms-dynamic-values`, but 
there are two reasons I haven't done so yet:

* It's too complex for expressing in attributes, so need a better way of adding these descriptions.
* Despite spending hours trying everything I could think of, I was completely unable to get
  dynamic values in parameters to work. I'm sure I was doing something wrong, but I can't seem
  to figure out what.

Once I can get these to work, I'll figure out a nice way to represent this in code.  

## Authentication

The second interesting part in the code is the authentication part. Making a connector that internally
handled authentication to Key Vault using a Service Principal would have been trivial, but very unflexible.
What if I wanted to support arbitrary Key Vaults?

So what I decided to do was force the consumer of the connector authenticate via Azure Active Directory
with a user that had permissions to access Key Vault, and then do an `On-behalf-of` flow to get a token
to Key Vault. I wasn't entirely sure how this would work when I started, but turned out to be
very possible, and even [documented](https://docs.microsoft.com/en-us/azure/logic-apps/custom-connector-azure-active-directory-authentication)
(though the docs could be clearer).

Authentication basically works like this:

```text
           +---------------+          +---------------+          +-----------------+
 User      |               | Provide  |               | Provide  |                 |
 Identity  |   Logic App   | Token    |   Connector   | Token    |    Key Vault    |
+--------> |    Client     +--------> |   WebApi      +--------> |                 |
           |               |          |               |          |                 |
           +-------+-------+          +-------+-------+          +-----------------+
                   |                          |
                   |                          | Obtain
                   |                          | on-behalf-of
                   |                          | token
                   |                          |
                   |                          v
                   | Auth with        +---------------+
                   | client app       |               |
                   +----------------> |   Azure AD    |
                                      |               |
                                      +---------------+
```

When using Azure AD authentication, Logic Apps requires that we register 2 applications
in AAD: One is a client web application, and the other is the app representing the connector itself.

### Setting up authentication

First thing I needed to do to support this was implement OAuth-based authentication in the WebApi itself.

I did this by implementing JSON Web Token (JWT) Bearer authentication, in `ConfigureServices()`:

```c#
services.AddAuthentication(o => {
  o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
  o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options => {
  options.Authority = Configuration["Auth:Authority"];
  options.Audience = Configuration["Auth:Audience"];
  options.SaveToken = true;
  // hack: don't validate issuers for now to support multi-tenant
  options.TokenValidationParameters.ValidateIssuer = false;
});
```

We first add authentication setting the default authentication and challenge scheme to `JwtBearer`.
I first missed this step when implementing the solution and took me a lot of time to figure out this
was why authentication was not working!

Then we add the authentication mechanism, setting the Authority and Audience, like this:

* __Authority:__ I set this to `https://login.microsoftonline.com/common`, since I wanted to register
  the connector as a multi-tenant application (I have not tested this yet, though).
* __Audience:__ This is just the Application Id of the application as registered in Azure AD.
  Again, since I was registering this as a multi-tenant application, it needs to be something like
  `https://[tenantname].onmicrosoft.com/[guid]`. Note that if the Azure AD had a custom domain name, this
  would be slightly different.

A couple more things are interesting in this registration:

* Setting `SaveToken` to true is important, as we'll need the raw bearer token later on for the
  `on-behalf-of` flow.
* Setting `ValidateIssuer` to false. This is definitely a bad idea, as we won't be validate the issuer signature
  on the received tokens, but it was the simplest way for now to make it work. The reason for that is that since
  the authority is set to the `common` endpoint, rather than a specific Azure Active Directory tenant,
  we don't have the necessary keys to validate the issuer signature. Normally, you'd implement this
  validation manually against a list of known issuers, but that was not really something I needed for now.
  Also, to some extent I don't care, since only the issuer tenant will be able to complete the
  `on-behalf-of` flow, anyway.

### Including authentication information in OpenAPI

In order to be able to configure the authentication settings in the custom Logic App connector, we need
that the OpenAPI description includes the supported authentication mechanism. So we want `Swashbuckle`
to include this information in our service description.

To do this, I added this when configuring the Swagger generation in `ConfigureServices()`:

```c#
services.AddSwaggerGen(c => {
  // ...
  c.AddSecurityDefinition("AAD", new OAuth2Scheme {
    AuthorizationUrl = "https://login.windows.net/common/oauth2/authorize",
    TokenUrl = "https://login.windows.net/common/oauth2/token",
    Flow = "accessCode",
    Scopes = new Dictionary<String, String>()
  });
  // ...
});
```

### Obtaining the Key Vault token

The final piece of the authentication puzzle was obtaining the delegated token to Key Vault in the
service operations. To do this, I use the overload of the `KeyVaultClient` class that takes an
authentication callback, which I implemented like this:

```c#
protected async Task<String> Authenticate(String tenantId, String resource, String scope) {
  Logger.LogTrace("Authenticate({0}, {1}, {2})", tenantId, resource, scope);
  String clientId = Configuration["Auth:ClientId"];
  String clientSecret = Configuration["Auth:ClientSecret"];

  var appCredentials = new ClientCredential(clientId, clientSecret);

  var assertion = await GetUserAssertion();

  var context = new AuthenticationContext(tenantId);
  var token = await context.AcquireTokenAsync(resource, appCredentials, assertion);
  return token.AccessToken;
}

protected async Task<UserAssertion> GetUserAssertion() {
  var auth = await this.HttpContext.AuthenticateAsync();
  var token = auth.Properties.GetTokenValue("access_token");
  return new UserAssertion(token);
}
``` 

This is straightforward code using the Azure Active Directory Authentication library.
When the `Authenticate` callback fires, we get the AAD tenant, the resource to
authenticate against and the scope.

The code does the following things:

* Obtain the client credentials. This is just the `Application Id` and `Client Secret` that
  authenticates our application to Azure Active Directory.
* Obtain the user assertion. We do this by extracting the saved JWT bearer token from
  the authentication context (this is why enabling `SaveToken` is necessary)
* Obtain the `on-behalf-of` token from AAD.

One improvement here would be to use a Key Vault based certificate for authenticating
against Azure AD rather than using a client secret, but I didn't want to add this complexity
for now. Managed Service Identity would be even better, but this is an unsupported scenario
at the moment.

## Final thoughts

In a followup post I will discuss how to register the necessary applications
in Azure Active Directory as well as how to register the custom connector.

The code described in this point can be found on [GitHub](https://github.com/tomasr/logicapps-key-vault-connector).