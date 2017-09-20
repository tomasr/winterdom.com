---
layout: post
category: Azure
title: Azure Managed Service Identity Library 
tags:
- Azure
- AppService
- ManagedServiceIdentity
comments: []
---
A few days ago, the preview of [Managed Service Identity](https://docs.microsoft.com/en-us/azure/active-directory/msi-overview)
for Azure was released, opening up some interesting possibilies to access other Azure resources
from your application in a secure manner.

App Service is [one of the services](https://docs.microsoft.com/en-us/azure/app-service/app-service-managed-service-identity)
adding support for managed service identity, including a nice [library](https://www.nuget.org/packages/Microsoft.Azure.Services.AppAuthentication)
to make it easier to use.

You can find some documentation for the `Microsoft.Azure.Services.AppAuthentication` library
on the sample [here](https://github.com/Azure-Samples/app-service-msi-keyvault-dotnet).

I spent some time today looking at it, and would like to share some thoughts about it.

The public surface of the library is fairly simple, and it is easy to use for the purpose it was built.
When used on App Service, it is very straightforward to use: It will automatically pick up the 
`MSI_ENDPOINT` and `MSI_SECRET` environment variables and get the token for the resource you specify.

> While testing, noticed that the `MSI_ENDPOINT` variable pointed to http://127.0.0.1:<port>/MSI/token/,
> where the `<port>` seems to be dynamically assigned for each app.

One interesting question that came up was how to support developing and debugging the application
on your local dev workstation when using this library, and it is supported. The basis of this is that
the library can be configured to use a mechanism other than MSI to generate the token.

You can modify the default behavior either by explicitly passing a connection string to the
`AzureServiceTokenProvider` constructor, or by storing it in the `AzureServicesAuthConnectionString`
environment variable.

There are several methods supported of authentication supported:

## Service Principal Id + Secret:

To use this method, set the connection string to something like:

```text
RunAs=App; TenantId=<tenant>; AppId=<principalId>; AppKey=<secret>
```

While this is probably the easier method to implement, it's not very secure, as it will
require you to have your service principal credentials in plain text somewhere. So it should
not be the preferred method for development. 

## Service Principal Id + X509 Certificate:

To use this method, set the connection string to something like:

```text
RunAs=App; TenantId=<tenant>; AppId=<principalId>; CertificateStoreLocation=[CurrentUser | LocalMachine]; [CertificateThumbprint=<thumbprint> | CertificateSubjectName=<cn>]
```

This adds a little bit of complexity to the process. You now need to:

* Install the authentication certificate on the certificate store
* Redeploy when the certificate expires

It is somewhat more secure than using application keys as you don't need to have credentials in plain text.
To mitigate the risk of losing control of the certificate, you could use a different Service Principal
per team member, but it adds quite a bit of work to the process.


## Your Azure CLI credentials:

This is an interesting alternative, based on using whatever credentials you're using on the Azure CLI
to access your Azure subscription. To use this method, set the connection string to:

```text
RunAs=Developer; DeveloperTool=AzureCLI
```

Internally, this will call `az account get-token` to acquire the token for the specified resource,
using the credentials (access token) stored by the Azure CLI for your subscription

This has the advantage of not having to store more credentials and no plain text, but it's only
as secure as your Azure CLI token.

When I first looked into this, I thought one disadvantage would be that you'd end up
accessing the resources under your own account, but then I remembered that the Azure CLI
does allow you to sign on using a service principal, so this is not really an issue.

There is, however, one disadvantages I can see:

The Azure CLI allows you to have multiple tokens to different accounts stored. So which one
is used by this library will depend on what your active subscription is (i.e. whatever 
you configured with `az account set`). That can easily cause your application to break
if you change the active account and forget to set it back to the correct one later on.

This part makes me a bit nervous, since it makes it somewhat unpredictable.

## Your Azure AD Account

This is another interesting alternative that will work in cases where you are logged
into your workstation using a domain account on a domain that is synchronized with
Azure Active Directory. You can enable this with the following connection string:

```text
RunAs=CurrentUser
```

The obvious advantage is that it doesn't need additional credentials at all, since
the library will simply take advantage of your domain credentials to obtain the token
to the requested resource.

The big downside is that the applicating will be accessing resources using your own identity,
rather than a service principal representing the application.

## Final Thoughts

Remember that this is based on an initial preview of the library, and things could change.
Maybe some of these methods will disappear or more will be added.

Overall, I was pleasantly surprised by the ease of use of the library. Having considered
alternatives allowing you to keep your code simple while still supporting developing
and running your application on your local workstation is a very welcome addition.

That said, every method has some advantages and disadvantages to be aware of; just make
sure to choose what works for you and meets your security requirements.

I need to think a bit more to decide what I'd consider the best option. The simplest is
using your Azure AD account, which will likely work well for isolated developer environments
(such as your own MSDN subscription), but it might not be a good choice for other environments.