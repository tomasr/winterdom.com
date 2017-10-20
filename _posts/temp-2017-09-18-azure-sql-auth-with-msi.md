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
  "principalId": "6110386e-4fef-422a-b5db-c6cd4a1373ee",
  "tenantId": "8305b292-c023-4f1e-af1a-a042eb5bceb5",
  "type": null
}
```

With the `principalId`, we can query AAD to get the full details of the principal,
using the `az ad sp show --id $principalId`, which should print something like this:

```json
{
  "appId": "716d2e7a-ce15-4d84-9f05-c52eccb3f511",
  "displayName": "kvtrapp1",
  "objectId": "6110386e-4fef-422a-b5db-c6cd4a1373ee",
  "objectType": "ServicePrincipal",
  "servicePrincipalNames": [
    "716d2e7a-ce15-4d84-9f05-c52eccb3f511",
    "https://identity.azure.net/oK39j26sAYNcxWFBTZI/+wr3KK86QhYt7Y85CZhnIq8="
  ]
}
```

> Note: remember that to use AAD users in SQL Azure, the SQL Server
> should have an AAD administrator, which the template provider does.

## Creating SQL Users

Now I can connect to my SQL database and create all the necessary users
from Azure Active Directory. Remember that for this we use the `CREATE USER`
and `ALTER ROLE` T-SQL statements.

First, I'll want to authenticate to SQL using the service principal
assigned, so I'll do something like:

```SQL

```
