---
layout: post
category: Azure
title: Azure File Storage and Billing Transparency
tags:
- Azure
- AzureStorage
- Cloud
comments: []
---

[Azure Files](https://docs.microsoft.com/en-us/azure/storage/files/?toc=%2fazure%2fstorage%2ffiles%2ftoc.json)
is an excellent service, providing file-system (SMB) based storage on the cloud. It has been
very useful for us together with Azure Kubernetes Service.

Functionality-wise, I have no complaints. While there are a few things that could be better, the
service overall provides good value, and the addition of Premium File Storage is definitely
a very interesting and exciting option.

I have been, however, dissatisfied with the Billing experience.

## Cloud Billing Transparency

I'm a strong believer that Cloud-based offerings need to have a clear set of billing rules
that customers can clearly understand and use to budget their cloud costs. There are 4 key
elements that I believe contribute to having clear and transparent cloud billing for
usage-based services:

1. The publicly available pricing information should clearly document what
   __billing meters__ are used and how these relate to the prices listed.
1. For services that charge for communication, any related billing meters should have
   a clear relation to the __underlying protocol__ operations and semantics.
1. The service should provide __metrics__ that allow customers to understand their usage.
1. Any metrics should clearly __relate__ to the corresponding billing meters, so that
   the customer can audit their bills for accuracy.

A customer that understands how your service is billed, budget properly for it,
and also audit the usage is a happy customer.

## The Azure Files Billing Conundrum

Why am I generally unhappy about how Azure Files are billed? It's not so much that I object
to the actual cost of the service (which is generally reasonable for most scenarios), but that
I believe that Azure Files breaks several of the rules above.

Let me explain why.

### Pricing Information vs. Billing Meters

The first issue I have with Azure Files is how [pricing information](https://azure.microsoft.com/en-us/pricing/details/storage/files/)
is presented. There are two separate components: Storage and Operations.

Storage pricing is very clearly presented, but Operation pricing is __very deceptive__.

Billing meters are only partially related to how pricing is presented. While pricing talks about
"Put, Create Container Operations" or "List Operations", billing meters include things such
as "protocol operations", and "lrs write operations". You can guess about how they are mapped
in some cases, but not all of them.

I would much rather the pricing information was presented by outlining the meters used and
what each one measures exactly.


### Billing and Protocols

Azure Files operation pricing is stated in terms of the underlying operations on the REST API. This
is fine if you're accessing the service over the HTTP interface, but that's not really the common usage
for Azure Files.

Instead, you'll mostly be accessing the service over SMB from Windows or Linux machines, and so there's
no clear relationship of how a File-System-based operation (such as `Open File`) maps to an operation
on the REST API. This leads to significant confusion and makes it easy to budget incorrectly for the service,
understimating the actual costs.

For example, I ran into a case where a service would often open a file, read from it, and then close it.
I was pretty surprised that my Azure Files bill was primarily composed of __"Write Operations"__. Well,
surprise-surprise, turns out that the file-system  _open a file_ operation is considered a write operation for
billing purposes. There was absolutely no way for me to figure that out before I wasted a lot of time
and a few support cases (which went nowhere) on it.

### Meters and Metrics

Azure Files supports some basic metrics, which get stored in Azure Storage Tables on the same
storage account. While these are useful in general, they are not very useful to audit your usage costs.

This is because the metrics, again, bear no direct relationship to the billing meters. For example, you will
see things like this in your storage metrics:

* `user;Create`
* `user;SessionSetup`
* `user;Write`
* `user;GetFile`
* `user;QueryInfo`
* ... and more

These bear a little bit more relationship to the file-system semantics of Azure Files access over SMB
(but still only partially). The big problem is that there's no obvious way to relate the metric values
to the corresponding Billing Meters being used. We can guess about what some of it means, but
since it's essentially undocumented, it does not provide a base that's stable enough to actually
audit your bill.

It also clearly doesn't relate very clearly to the public pricing information, either.

But beyond the obvious disconnect with pricing/meters, there's an even more annoying issue with
Azure Files metrics: They don't provide enough information to actually troubleshoot billing issues,
because there are no corresponding access logs for Azure Files.

So if my Azure Files bill grows 10x in write operations, there doesn't appear to be a way to figure out
what shares, folders, or files are actually getting accessed and thus triggering the usage increase. Even
Microsoft Support appears unable to obtain this information, which means that if you run into such a case,
you're stuck trying to figure things out by trial and error.

## Conclusion

While Azure Files provides an excellent platform for cloud services, make sure you understand exactly
what your usage patterns are and keep in mind that the file-system nature of the service seems to be
very much at odds with how the pricing information is presented. Expecting some surprises in your bill
while you understand your usage patterns better might be a good idea, too.
