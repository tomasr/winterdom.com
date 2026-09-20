---
layout: post
category: Azure
title: Azure SQL Database Service Principal not present in AAD
tags:
- Azure
- AAD
comments: []
---
A while ago, I wrote a [post]({% post_url 2017-08-31-token-delegation-azure-sql %}) about enabling
authentication to Azure SQL Database using delegated token credentials. A kind reader reported the
following issue:

> I am currently not able to see the Azure SQL Database API in the list of API's from the Azure AD
> App that I have created

I looked at two different Azure subscriptions, tied to different Azure Active Directory Tenants,
and noticed that the `Azure SQL Database` service principal would show up just fine in both. However,
it was not there on another, standalone AAD tenant that has no Azure subscriptions associated with it.

A workaround is hinted on the [Azure AD documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-application-objects):

> When an application is given permission to access resources in a tenant (upon __registration__ or consent),
> a service principal object is created.

The answer is to manually create a new Service Principal in our local AAD Tenant, which we can
easily do using PowerShell and the AzureRM cmdlets:

* Launch a new PowerShell console
* Login to your AAD tenant using the command `Login-AzureRmAccount -TenantId <tenant>`
* Run the following command to create the new serice principal:

```ps1
New-AzureRmADServicePrincipal -ApplicationId 022907d3-0f1b-48f7-badc-1ba6abab6d66
```

If the command is successful, you should see something like the following:

```text
ServicePrincipalNames : {https://database.windows.net/, https://database.usgovcloudapi.net/, 022907d3-0f1b-48f7-badc-1ba6abab6d66}
ApplicationId         : 022907d3-0f1b-48f7-badc-1ba6abab6d66
DisplayName           : Azure SQL Database
Id                    : 676b19fd-abee-4d52-a7c4-688612c7ed27
Type                  : ServicePrincipal
```

After this, you should be able to add the necessary permissions to your custom application.