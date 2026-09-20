---
layout: post
category: Azure
title: AKS and Azure Files Permissions
tags:
- Azure
- AzureStorage
- AKS
- Kubernetes
comments: []
---

Saving this here for my own recollection later on. Warning, a bit of ranting ahead.

Recently, I've been running a lot of trials on top of the Azure managed Kubernetes
Service (AKS). One key feature that I needed was the ability to provide services
deployed to an AKS cluster with external storage. Since I needed the option
to mount the storage shared between multiple pod instances, Azure Files was the way to go.

My first attempt to do this leveraged using automated static volume provisioning,
as defined in the [documentation](https://docs.microsoft.com/en-us/azure/aks/azure-files-volume).
_Static_ just means that you first create the Azure File Share on your own,
and then provide the pod with the necessary information to reach it, such as the
account name and key, and the file share name.

This worked, sort of. There's a big gotcha that's not included in the documentation, and
that takes a bit of search-fu to [find it](http://unethicalblogger.com/2017/12/01/aks-storage-research.html).

The problem is _file permissions_. When using static provisioning, the Azure Files plugin
in Kubernetes will default the share permissions to `0750` or `0700` depending on the version
of Kubernetes in use.

What this means is that static provisioning, as described in the AKS documentation,
is _completely useless_ if the following conditions are met:

* Your container is configured to run as a non-root user (which is generally the recommended
  approach for security), and
* You need to write to the mounted file share.

If you just need to read data from the share, then this is not a problem. If you need to write to it,
however, this really throws a wrench into your plans, and the documentation doesn't tell you
how to work around it.

## The workaround

The workaround is described in more detail on [this sample](https://github.com/andyzhangx/Demo/blob/master/linux/azurefile/azurefile-mountoptions.md#set-mountoptions-in-static-provisioning-for-azure-file-support-from-v150)
by Andy Zhang.

* Create a new Kubernetes Persistent Volume for your Azure Files Share, and override the
  default file and directory permissions for the file share.
  ```yaml
  apiVersion: v1
  kind: PersistentVolume
  metadata:
    name: pv-azurefile
  spec:
    capacity:
      storage: 5Gi
    accessModes:
      - ReadWriteMany
    azureFile:
      secretName: azure-secret
      shareName: k8stest
      readOnly: false
    mountOptions:
      - dir_mode=0777
      - file_mode=0777
      - uid=10000
      - gid=10000
      - mfsymlinks
      - nobrl
  ```
* Create a new Persistent Volume Claim for your service to request access to the
  Persistent Volume created in the previous step
  ```yaml
  kind: PersistentVolumeClaim
  apiVersion: v1
  metadata:
    name: pvc-azurefile
  spec:
    accessModes:
      - ReadWriteMany
    mountOptions:
    resources:
      requests:
        storage: 5Gi
    storageClassName: ""
    volumeName: pv-azurefile  
  ```
* Create a volume for your pod out of the PVC.
  
  ```yaml
  volumes:
    - name: azurefile01
      persistentVolumeClaim:
        claimName: pvc-azurefile
  ```

Notice that the storage capacity is required on both the Persistent Volume and the Claim, and should be
equal or smaller to your Azure File Share size.

## The disadvantages

The documented workaround works just fine. However, the whole issue is frustrating on many levels.

First of all, making it hard to follow the recommended practice of running containers
as non-privileged users makes no sense to me. This should be easy, and work right away without
having to result to these complicated steps.

Second, the fact that the documentation doesn't warn you about the issue, and doesn't provide a link
to the solution, is very frustrating, and causes you to lose a few hours for no good reason.

While I can sort of understand why restricting the default Unix permissions on the file share,
it seems to me this is just a very leaky abstraction, than on a platform like AKS doesn't make
a lot of sense.

The most frustrating aspect for me, however, is the fact that using Persistent Volumes forces you
to have to create those manually before you can deploy applications. If you just need
to reference a single Azure File Share, then it's sort of OK, but if you need to reference
several, it quickly adds to a lot of work. You need to manually create at least 2 Kubernetes objects
(a Secret, and the Persistent Volume) for each share.

I'm using [Helm](https://docs.helm.sh/) to deploy my application, and now I can't simply
deploy the helm chart. I need to manually create stuff, ensure it's correct, and only then can I
deploy it. This is just cumbersome.

I wish you could just adjust default permissions directly when creating the volume, but alas,
apparently this is not possible with the Kubernetes model (or simply unsupported by the Azure Files plugin).

__Update:__ Posted some additional findings [here]({% post_url 2018-07-26-azurefile-persistent-volumes-retain-issue %})

## Getting fixed!

__Update 2018-11-15__: Looks like this issue is [finally fixed](https://github.com/kubernetes/kubernetes/pull/69854)
in Kubernetes `v1.11.4` with the default permissions for Azure Files reverting to `0777`.
Great news.