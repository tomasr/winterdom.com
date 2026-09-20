---
layout: post
category: Azure
title: AKS Node Troubles
tags:
- Azure
- AKS
- Kubernetes
comments: []
---

I've been having lots of fun this past week running some interesting experiments
on [Kubernetes](https://kubernetes.io/). For simplicity, I created a single-node
[AKS](https://azure.microsoft.com/en-us/services/kubernetes-service/)
(Azure Kubernetes Cluster) using a B2S instance on Azure.

Everything worked perfectly until Friday afternoon. At some point, I noticed that
every operation on the cluster appeared to be very slow. Even browsing
the Kubernetes admin portal was an exercise in frustration. The worker node, however
never went above 20% CPU.

I then tried restarting the node, which proved to be.... a mistake, as it never
came back up completely.

After a while, I started noticing that when running `kubectl get nodes`, the node
was being reported as NotReady. I didn't have time to troubleshoot it further, so
left it like that and tried again today, without much more luck.

After searching for a bit, tried doing a `kubectl describe node <node>`, and noticed
it was reporting:

```text
KubeletNotReady           PLEG is not healthy....
```

Of course, trying to find out what `PLEG` was supposed to be was next to impossible.
I did, however, looked up the `kubelet` logs using `journalctl -u kubelet`, but didn't
see anything noteworthy there.

I then tried restarting the `kubelet` service which sort of worked! After about 5 mninutes
the node transitioned to the `Ready` status, and about 3 pods came up to `Running` status.
Unexpectedly, all 3 were user pods, and not a single one of the `kube-system` pods came
up before the node went back to `NotReady` status. Again, the reported failure was
`PLEG is not healthy`.

## Conclusion

So far, I have failed to figure out exactly what triggered this issue, and how to solve
the underlying issue. Heck, I'm still trying to figure out what PLEG is.

The logical thing to do would have been to nuke the node, and create a new one from scratch.

However, I couldn't figure out an obvious way to do that with AKS. While you can easily
scale your cluster to add additional nodes, it's not obvious how to replace an unhealthy node
with a new one. I'm sure it might be possible, but I didn't spend much trying to look for it.

What did worked was upgrading the cluster. I originally created it using Kubernetes
`1.10.3`, and then noticed that `1.10.5` was available.

Kubernetes upgrades in AKS work by provisioning a new node, then removing the old one, and so
it proved an indirect way to do exactly what I wanted, resulting in a healthy cluster again.
However, I'm still scratching my head as to what happened and what exactly was failing...
