---
layout: post
category: Azure
title: Re-creating a subscription in Azure API Management
tags:
- Azure
- APIManagement
comments: []
---
Yesterday I ran into an interesting scenario with Azure API Management. A customer had a production
API Management service instance, on which they had a subscription to a product that was used by a
mobile application. Somehow, the subscription got deleted, which immediately broke the
client application, as it could no longer reach its backend services.

Most people are unaware of this, but there is actually a process for backing up your
API Management configuration and restoring it later. It is documented
[here](https://docs.microsoft.com/en-us/azure/api-management/api-management-howto-disaster-recovery-backup-restore).

This is not surprising, since this functionality is currently exposed only in the ARM APIs. It's not exposed
on the Azure Portal, and not even in the PowerShell cmdlets, but requires you to write an application
to do the backup/restore operations. I very much hope this makes it into an easier process, built into
the portal and PowerShell so that it is easy to do and script.

Fortunately, we found a workaround to solve the issue:

First, we manually created a new subscription for the application to the right product.
This by itself doesn't fix the issue, since the new subscription gets brand new Primary/Secondary keys.

Then we got ahold of the current subscription key being used by the mobile application, and
through some PowerShell, we modified the Primary Key in the new subscription to match the old key, which
restored service.

Here's the way to accomplish that second part:

```powershell
$azureSubscription = '<subscriptionId>'
$resourceGroup = '<resourceGroup>'
$serviceName = '<apiManagementResource>'
$productId = '<productId>'
$userEmail = '<userEmail>'
$oldSubscriptionKey = '<subscriptionKey>'

Login-AzureRmAccount
Select-AzureRmSubscription -SubscriptionId $azureSubscription
$context = New-AzureRmApiManagementContext -ResourceGroupName $resourceGroup `
                                           -ServiceName $serviceName
# find the user Id based on the email
$user = Get-AzureRmApiManagementUser -Context $context -Email $userEmail

# find the subscription to modify
$subscription = Get-AzureRmApiManagementSubscription -Context $context `
                                                     -UserId $user.UserId `
                                                     -ProductId $productId

Set-AzureRmApiManagementSubscription -Context $context
                                     -SubscriptionId $subscription.SubscriptionId `
                                     -PrimaryKey $oldSubscriptionKey
```

Once this was done, the existing mobile application was able to talk again to its backend through
API Management. This is something you hope you don't need, but it's a nice trick for
some scenarios.