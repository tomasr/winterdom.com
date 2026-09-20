---
layout: post
category: Azure
title: AzureFile Persistent Volumes Retain Issue
tags:
- Azure
- AKS
- Kubernetes
comments: []
---

A bit ago, I [posted]({% post_url 2018-07-23-aks-azure-files-permissions %}) about some issues around permissions
when using static provisioning of Azure File volumes in Azure Kubernetes Service (AKS). In there, I mentioned that the
workaround was to use explicit Persistent Volumes so that the right mount options could be created.

Since then, I've run into a separate, but related, issue. I started noticing that sometimes, my Persistent Volume Claims
would get stuck on the `PENDING` state:

![Pending Persistent Volume Claims]({{site.images_base}}/2018/aks-azurefiles-2.png)

The notes for the PVCs would not contain any useful information. But looking at the Persistent Volumes, I noticed
they would get stuck in the `RELEASED` state:

![Released Persistent Volumes]({{site.images_base}}/2018/aks-azurefiles-3.png)

I could not figured out exactly what was happening until I noticed the pattern that led to it:

1. I'd create the Persistent Volumes
2. Then I'd deploy an application on the cluster that would create Persistent Volume Claims on the volumes
3. I'd update the application. This worked just fine and stuff continued to run.
4. I'd remove the application (thus deleting the Persistent Volume Claims)
5. I'd deploy the application again, and now the PVCs would get stuck in `Pending` state.

The issue of course, happened in step (4) above. Once the Persistent Volume Claim was deleted, the Persistent Volume
would transitioned to the `Released` status. These volumes all had a default
[reclaim policy](https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/) of `Retain`.

Based on my understanding, I would have expected that taking a new claim on the volumes would work. But unfortunately,
this does not appear to be the case (either I'm misunderstanding the Kubernetes documentation, or there's an issue
here in the volume provider).

I also thought that maybe making this work would involve setting the retain policy to `Recycle`, but this appears
to be unimplemented as of yet for the azureFile provider.

In any case, once this happens, the only way to get this working again is to manually delete the Persistent Volumes
and recreate them again from scratch.

This is unexpected (not explicitly documented), not obvious, and certainly annoying.:w
