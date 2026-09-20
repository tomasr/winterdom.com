---
layout: post
category: Azure
title: API Management Sign-in Tenant
tags:
- Azure
- APIManagement
comments: []
---
Azure API Management supports multiple identity providers for the Developer Portal. One of these
is [Azure Active Directory](https://docs.microsoft.com/en-us/azure/api-management/api-management-howto-aad).
A common complaint, however, was that when enabling AAD authentication on the developer portal, the
sign-in experience would use the default look-and-feel of AAD rather than your organization's customized
sign-in pages.

The reason for this is that unlike many other products and services, API Management always works as a
multi-tenant application allowing users from multiple AAD tenants (the ones you configure). Because of this
it always uses the common AAD sign-in URL `https://login.microsoftonline.com/common` rather than
the tenant-specific sign-in URL `https://login.microsoftonline.com/{tenant_name_or_id}`. You can read
more about the common endpoint in the [AAD documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-devhowto-multi-tenant-overview).

This changed a few weeks ago on the API Management side. Looking at the
[release notes](https://blogs.msdn.microsoft.com/apimanagement/2018/03/28/release-notes-march-28-2018/), we
find this little note:

> When configuring Azure AD as an identity provider, it is now possible to designate one of
> the allowed tenants as a sign-in tenant. All developer portal users will be redirected to
> that tenant when logging in (instead of the "common" tenant)

The new configuration property on the AAD identity provider is called `signinTenant`, and can be configured
in the Azure Portal experience when adding (or editing) an AAD identity provider:

![AAD identity provider configuration]({{site.images_base}}/2018/apim-aad-1.png)

> __Note:__ When configuring a new provider, you need to both _add_ the tenant ID to
> the allowed tenant list, and provide it in the sign-in tenant field if you want it to work.

There is also a nice side-effect from configuring the `signinTenant` property: Before this, using guest accounts
in AAD directories, such as Microsoft Accounts (MSA) or guest B2B accounts to sign in to the API
Management Developer Portal was not supported. The reason for this is that when using the `common` endpoint,
AAD has no way to know the target directory to sign the user into.

If you set the `signinTenat` property, however, this now works for both MSA and B2B guest accounts on the
that specific tenant. This enables a lot of useful scenarios for API Management users.