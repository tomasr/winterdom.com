---
layout: post
category: Azure
title: Azure Managed Service Identity - Querying in ARM Template  
tags:
- Azure
- AzureResourceManager
- ManagedServiceIdentity
comments: []
---
In a previous [post]{% post_url 2017-09-07-azure-sql-tde-protector-keyvault %} I was lamenting not having a way
to obtained the managed service identity generated for an Azure resource, such as a Azure SQL logical server
or a Web App from the Azure Resource Manager (ARM) template itself.

The issue was that the `reference()` function in an ARM template only returns the `properties` part of the
resource definition, and the `identity` property is defined outside of that (at the same level as the
resource id or the location).

It is now possible to do this thanks to a [new parameter](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-template-functions-resource#reference)
introduced in the `reference()` function in ARM. The new definition is:

```c
reference(resourceName | resourceIdentifier, [apiVersion], ['Full'])
```

Notice the new, optional `'Full'` parameter. When this is specified, the `reference()` function returns the
complete resource definition, and not just the `properties` section. So we can obtain the generated
identity easily using something like this:

```json
{
    "outputs": {
        "sqlIdentity": {
            "type":"string",
            "value": "[reference(concat('Microsoft.Sql/servers/', parameters('sqlServerName')), '2015-05-01-preview', 'Full').identity.principalId]"
        }
    }
}
```