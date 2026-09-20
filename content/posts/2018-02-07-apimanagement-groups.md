---
layout: post
category: Azure
title: API Management Groups
tags:
- Azure
- APIManagement
comments: []
---
Azure [API Management](https://docs.microsoft.com/en-us/azure/api-management/api-management-key-concepts) supports the concept of [User Groups](https://docs.microsoft.com/en-us/azure/api-management/api-management-howto-create-groups)
to manage the visibility of Products to users.

They are somewhat interesting, in that it is not obvious how to leverage them right away.
As the documentation states, there are 3 built-in, system groups:

* Administrators
* Developers
* Guests (anonymous, unathenticated users)

These groups are immutable, meaning you cannot add or remove members to these groups. This sounds a bit strange at first, but it is not a big deal:

* The __Administrators__ group is a bit of a left-over from having the Publishers Portal. Since this is
  [soon going away](https://blogs.msdn.microsoft.com/apimanagement/2018/02/06/publisher-portal-deprecated-april-1-2018/),
  it is not that big of a deal.
* The __Developers__ group has any user that has signed up for the Developer Portal, so all external users
  are added automatically to this group.
* The __Guest__ group is special, as it really doesn't have any members. It's really non-users, so it fills a special need.

Custom Groups, however, are quite interesting, if you take a bit of time to explore how
they work. To do that, let's consider the following scenario:

You have a single API Management instance, on which you expose both internal and
external APIs. Internal APIs are only for consumption within your organization,
while external APIs will be consumed by third-parties.

The right way to do this would be to ensure that both Internal and External APIs are assigned
to different Products. So let's say we have the following:

* Product `Order Fulfillment`, for internal use only, has the following APIs:

  ![Order Fulfillment Product]({{site.images_base}}/2018/apim-groups-1.png)
* Product `Customer Service`, exposed to third-parties, has the following APIs:

  ![Customer Service Product]({{site.images_base}}/2018/apim-groups-2.png)

Normally, when we add a new Product, users in the `Administrators` group get access to it automatically.
The usual procedure would be to grant users in the `Developers` group to each product as well, but
that would mean _everyone_ would be able to see the products.

Instead, what we want is to create two separate groups representing internal and externals users,
and grant the right access to the right product:

* Group `Organizational Users` only has access to product `Order Fulfillment`
* Group `Third Parties` only has access to product `Customer Service`

So now, only internal users will only be able to subscribe to the `Order Fulfillment` product,
while external users will only be able to subscribe to the `Customer Service` product. The interesting
part comes from the fact that permissions on APIs are transitive from Products.
This means that when you log into the Developer Portal, you will only be able to see APIs
that belong to Products you have permissions for, and not the rest!

So in this example, if I log into the portal with a user who is only member of the
`Organizational Users` group, I only see APIs in the `Order Fulfillment` product:

![Organizational User]({{site.images_base}}/2018/apim-groups-3.png)

If I sign in to the portal with a user who is member of the `Third Parties` group,
then I only see APIs in the `Customer Service` product:

![Third Parties User]({{site.images_base}}/2018/apim-groups-4.png)

## Something to keep in mind

There are a few things worth keeping in mind about API Management Groups:

* Remember that any APIs associated to products to which the `Developers` or `Guests`
  groups have access will be pretty much visible to everyone.
* If you decide to change your Product / Group structure later on, you will find that if
  a user has a subscription to a Product, she will be able to see all APIs included in
  the product, even if the groups the user is a member of do not grant permissions over
  said product. This will be the case until all said subscriptions are removed.gg