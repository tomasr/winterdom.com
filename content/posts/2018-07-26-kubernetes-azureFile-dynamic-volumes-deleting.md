---
layout: post
category: Azure
title: Issues when deleting azureFile dynamic volumes in Kubernetes
tags:
- Azure
- AKS
- Kubernetes
comments: []
---

I've been doing a lot of work lately with Kubernetes and Azure Kubernetes Service in particular. For this,
I'm using the azureFile storage provider to support providing storage folders for my pods.

For one specific case, I'm using dynamic provisioning of persistent volumes, as described in the
[documentation](https://docs.microsoft.com/en-us/azure/aks/azure-files-dynamic-pv). This has been working great.
Almost.

Today I noticed something odd. Some of the Persistent Volumes created were stuck on a failed state
during deletion:

![Failed Persistent Volumes]({{site.images_base}}/2018/aks-azurefiles-1.png)

The error message was this:

```text
Failed to create deleter for volume "pvc-85ba62d5-902e-11e8-9771-2a03d0b14ac3": Couldn't get secret 6d07576ce8d89bd641b5/azure-storage-account-fd9063993902011e888c32e-secret
```

This actually made sense. The way dynamic persistent volumes work is this:

* When the Persistent Volume Claim is created, Kubernetes creates a new Secret object containing the
  credentials for the Azure Storage Account. This secret is named `azure-storage-account-<namespace>-secret`.
* When the Persistent Volume Claim is deleted, the deleter for the volume will use these credentials
  to delete the Azure File Share that was dynamically created, and then delete the corresponding secret.

The second part is what was biting me.

I currently deploy the applications using [Helm](https://docs.helm.sh/). I deploy each one into a separate Kubernetes
Namespace. This is fully supported by Helm, but has one issue: When you delete the application using
`helm delete`, the original namespace created remains behind. I wanted to clean these up, and so
was aggressively deleting them using `kubectl delete namespace`.

The problem here is that the secret that gets automatically created by the azureFiles provider when
the Persistent Volume Claim is created, goes into the same namespace as the PVC. That meant that when I was
aggressively removing the namespace, I was also deleting the secret before the volume deleter could get to it.

This isn't very clearly documented (or at least I found no mention of this), so it might be something to watch out for.