---
layout: post
category: Azure
title: Defining RBAC Role Assignments in ARM Templates
tags:
- Azure
- ARM
- Security
comments: []
---

It's no secret I'm a big fan of Azure Resource Manager (ARM) templates. Getting
started with ARM templates is hard, but well worth the effort, and make it significantly
easier to have reproduceable, consistent deployments of your Azure resources.

One thing that I had been feeling left out, however, was being able to
assign permissions to Azure resources during creation. Azure's Role-based Access Control
(RBAC) mechanism is a powerful way to control who can manage and access your resources,
and having to do this through scripting was possible, but cumbersome at times.

A few days ago, I realized that you can actually
[create RBAC role assignments](https://github.com/Azure/azure-quickstart-templates/tree/master/101-rbac-builtinrole-resourcegroup)
through ARM templates just like any other resource. This capability is not new by any means, I
just had missed it before!

## Creating an assignment

To create an assignment, you need the following information:

* The ID of the role you want to assign. This is a long string that contains the
  subscription id and the role identifier (both GUIDs).
* The object ID of the user/group/service principal you want to grant access to.
* The scope at which you want to assign the role, which is going to be either a
  subscription, resource group, or resource id.

Here's an example of creating such an assignment:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": { 
    "monitoringUsersGroup": {
      "type": "string",
      "metadata": {
        "description": "Object ID for the monitoring users group in AAD"
      }
    }
  },
  "variables": {
    "monitoringContributorRole": "[concat(subscription().Id, '/providers/Microsoft.Authorization/roleDefinitions/749f88d5-cbae-40b8-bcfc-e573ddc772fa')]"
  },
  "resources": [
    {
      "type": "Microsoft.Authorization/roleAssignments",
      "name": "ace492e6-ebf6-48fa-8dd4-ea762489cbf3",
      "apiVersion": "2017-10-01-preview",
      "properties": {
        "roleDefinitionId": "[variables('monitoringContributorRole')]",
        "principalId": "[parameters('monitoringUsersGroup')]",
        "scope": "[resourceGroup().Id]"
      }
    }
  ],
  "outputs": {}
}
```

Here we grant the members of an Azure Active Directory group the `Monitoring Contributor`
built-in role to the resource group the template is deployed to.

Also interesting here is that you don't need to specify a `location` property in the resource.

## Some gotchas

There are a couple of things to watch out for when doing this.

The first one is that to assign a role, you need the `objectId` of the AAD user/group/principal,
rather than the name. This is cumbersome because there's no way to resolve these within
the ARM template itself, so you'll always need to pass these as input parameters.

A more significant issue, however, is the `name` of the `roleAssignment` resource, which
needs to be a unique GUID.

This is a problem if, for example, you're assigning role permissions at the resource group
or individual resource level, rather than globally at the subscription.

For example, in my case I was creating a template that would be used to deploy multiple
copies of the same resources into different resource groups within the same subscription.

If the GUID that defines the role assignment name is hardcoded in the template, then
each time I ran the template, the `scope` of the role assignment would get overwritten with
the id of the last resource group it was deployed to. Clearly, this is undesirable.

What we need then, is a way to ensure that each deployment to a different resource group
uses a different GUID for the role assignment, but at the same time, ensure that the same
one is used when deploying to the same resource group.

Clearly, providing the assignment GUID as a parameter is an easy workaround, but very cumbersome.

A better workaround comes from the [guid](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-template-functions-string#guid)
function! It takes one or more strings that are used to calculate a hash, very much
like the `uniquestring` function; only this one generates a string in GUID format instead.

By using the `guid` function with the resource group id and some other consistent stuff as input,
we can solve our problem in an elegant way:

```json
    {
      "type": "Microsoft.Authorization/roleAssignments",
      "name": "[guid(resourceGroup().id, 'monitoringUsers')]"
    }
```