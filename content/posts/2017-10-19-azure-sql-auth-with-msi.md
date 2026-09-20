---
layout: post
category: Azure
title: Azure SQL authentication with a Managed Service Identity 
tags:
- Azure
- AzureSQL
- AppService
- ManagedServiceIdentity
comments: []
---
On a [previous article]({% post_url 2017-08-31-token-delegation-azure-sql %}) I
discussed how to use a certificate stored in Key Vault to provide authentication
to Azure Active Directory from a Web Application deployed in AppService so that
we could authenticate to an Azure SQL database.

With the introduction of [Managed Service Identity](https://azure.microsoft.com/en-us/blog/keep-credentials-out-of-code-introducing-azure-ad-managed-service-identity/),
this becomes even easier, as we can just get rid of the complexity of deploying
the Key Vault certificate.

Let's see how we could use MSI to authenticate the application to a SQL Database.

## Enabling Managed Service Identity

The first step is creating the necessary Azure resources for this post. As usual, I'll
use Azure Resource Manager (ARM) templates for this. I'll create a new SQL Server, SQL
Database, and a new Web Application.

The only difference here is we'll ask Azure to create and assign a service principal
to our Web Application resource:

```json
{
    "name": "[parameters('webAppName')]",
    "type": "Microsoft.Web/sites",
    "location": "[resourceGroup().location]",
    "apiVersion": "2015-08-01",
    "dependsOn": [
        "[resourceId('Microsoft.Web/serverfarms', parameters('webAppPlanName'))]"
    ],
    "tags": {
        "[concat('hidden-related:', resourceId('Microsoft.Web/serverfarms', parameters('webAppPlanName')))]": "Resource",
        "displayName": "Web Application"
    },
    "identity": {
        "type": "SystemAssigned"
    },
    "properties": {
        "name": "[parameters('webAppName')]",
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('webAppPlanName'))]",
        "siteConfig": {
            "connectionStrings": [
                {
                    "name": "SqlDb",
                    "connectionString": "[concat('Data Source=tcp:', parameters('sqlServerName'), '.database.windows.net,1433; Initial Catalog=', parameters('sqlDbName'))]"
                }
            ]
        }
    },
    "resources": [
        {
            "name": "appsettings",
            "type": "config",
            "apiVersion": "2015-08-01",
            "dependsOn": [
                "[resourceId('Microsoft.Web/sites', parameters('webAppName'))]"
            ],
            "properties": {
                "AAD_TENANT_ID": "[subscription().tenantId]"
            }
        }
    ]
}
```

The key bit in the template above is this fragment:

```json
"identity": {
    "type": "SystemAssigned"
},
```

> __Note:__ You can also enable MSI from the Azure Portal for an existing Web App.

Once the web application resource has been created, we can query the identity
information from the resource:

```sh
az resource show -n $webApp -g $resourceGroup --resource-type Microsoft.Web/sites --query identity
```

We should see something like this as output:

```json
{
  "principalId": "f76495ad-d682-xxxx-xxxx-bc70710ebf0e",
  "tenantId": "8305b292-c023-xxxx-xxxx-a042eb5bceb5",
  "type": null
}
```

With the `principalId`, we can query AAD to get the full details of the principal,
using the `az ad sp show --id $principalId`, which should print something like this:

```json
{
  "appId": "09b89d60-1c0f-xxxx-xxxx-e009833f478f",
  "displayName": "msitr2app",
  "objectId": "f76495ad-d682-xxxx-xxxx-bc70710ebf0e",
  "objectType": "ServicePrincipal",
  "servicePrincipalNames": [
    "09b89d60-1c0f-xxxx-xxxx-e009833f478f",
    "https://identity.azure.net/R1arAxq7+EKpM2wyumvvaZ0n+9ICN6YkZB/sse/1VtI="
  ]
}
```

> Note: remember that to use AAD users in SQL Azure, the SQL Server
> should have an AAD administrator, which the template provider does.

## Creating SQL Users

Azure SQL Database does not support creating logins or users from
servince principals created from Managed Service Identity. The only way to
provide access to one is to add it to an AAD group, and then grant
access to the group to the database.

We can use the Azure CLI to create the group and add our MSI to it:

```bash
az ad group create --display-name SQLUsers --mail-nickname 'NotSet'
az ad group member add -g SQLUsers --member-id f76495ad-d682-xxxx-xxxx-bc70710ebf0e
```

Notice that in the second command, we're passing the `objectId` or `principalId` value,
rather than the application id.

Now, I can grant access to the group using the same script we've used in the previous posts:

```powershell
.\Add-SqlAadUser.ps1 -sqlServer $serverName -database $dbName -sqlAdminCredentials $cred -aadUser SQLUsers
```

## Authenticating to the Database

To obtain a token for our Azure SQL database, I'll use the
[Microsoft.Azure.Services.AppAuthentication](https://www.nuget.org/packages/Microsoft.Azure.Services.AppAuthentication)
library:

```c#
public static class ADAuthentication
{
    const String SqlResource = "https://database.windows.net/";

    public static Task<String> GetSqlTokenAsync()
    {
        var provider = new AzureServiceTokenProvider();
        return provider.GetAccessTokenAsync(SqlResource);
    }
}
```

Then we can use the token to authenticate to SQL and obtain the username, to ensure we are
indeed connecting with our Managed Service Identity:

```c#
public async Task<ActionResult> UsingSP()
{
    String cs = ConfigurationManager.ConnectionStrings["SqlDb"].ConnectionString;

    var token = await ADAuthentication.GetSqlTokenAsync();

    var user = await GetSqlUserName(cs, token);
    ViewBag.SqlUserName = user;
    return View("UserContext");
}

private async Task<String> GetSqlUserName(String connectionString, String token)
{
    using (var conn = new SqlConnection(connectionString))
    {
        conn.AccessToken = token;
        await conn.OpenAsync();
        String text = "SELECT SUSER_SNAME()"; 
        using (var cmd = new SqlCommand(text, conn))
        {
            var result = await cmd.ExecuteScalarAsync();
            return result as String;
        }
    }
}
```

The value of `SUSER_SNAME()` should come back something like this:
`09b89d60-1c0f-xxxx-xxxx-e009833f478f@8305b292-c023-xxxx-xxxx-a042eb5bceb5`. Notice that
what we get back as the name is based on the `applicationId` of the service principal.

## Final Thoughts

Managed Service Identity makes it a lot simpler and more secure to access other
Azure resources from your Web Applications deployed to App Service. Notice, however,
than in its current form it will not support scenarios such as credential delegation,
but we may see support for this added in the future.