---
layout: post
category: Azure
title: AKS Service Principal Credentials
tags:
- Azure
- AKS
- Kubernetes
comments: []
---

When creating a new Azure Kubernetes Service (AKS) cluster, you must define
a Service Principal in your Azure Active Directory Tenant that will
be used by the cluster to do operations on the Azure infrastructure later on.

The [documentation](https://docs.microsoft.com/en-us/azure/aks/kubernetes-service-principal) states:

> On the master and node VMs in the Kubernetes cluster, the service principal
> credentials are stored in the file `/etc/kubernetes/azure.json`

I was curious how this worked, so I set out to take a look at the file. An easy way to do this
was to spawn a new `busybox` pod on the cluster with the `azure.json` file
mounted as a volume into the container.

I used the following YAML template to create the pod using `kubectl apply`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test
spec:
  containers:
  - name: test
    image: busybox
    command:
      - sleep
      - "3600"
    volumeMounts:
      - mountPath: /etc/kubernetes/azure.json
        name: azure-secret
  volumes:
    - name: azure-secret
      hostPath:
        path: /etc/kubernetes/azure.json
        type: File
```

Once the pod is up and running, I went spelunking into it by opening a new interactive session
using `kubectl exec -it test -- sh`.

First, let's look at the contents of the file through `cat /etc/kubernetes/azure.json`:

```json
{
    "cloud":"AzurePublicCloud",
    "tenantId": "*********",
    "subscriptionId": "*********",
    "aadClientId": "**********",
    "aadClientSecret": "*********",
    "resourceGroup": "MC_dev-k-eastus-2-rg_dev-k-eastus-2_eastus",
    "location": "eastus",
    "vmType": "standard",
    "subnetName": "aks-subnet",
    "securityGroupName": "aks-agentpool-22088002-nsg",
    "vnetName": "aks-vnet-22088002",
    "vnetResourceGroup": "",
    "routeTableName": "aks-agentpool-22088002-routetable",
    "primaryAvailabilitySetName": "agentpool-availabilitySet-22088002",
    "primaryScaleSetName": "",
    "cloudProviderBackoff": false,
    "cloudProviderBackoffRetries": 0,
    "cloudProviderBackoffExponent": 0,
    "cloudProviderBackoffDuration": 0,
    "cloudProviderBackoffJitter": 0,
    "cloudProviderRatelimit": false,
    "cloudProviderRateLimitQPS": 0,
    "cloudProviderRateLimitBucket": 0,
    "useManagedIdentityExtension": false,
    "useInstanceMetadata": true,
    "providerVaultName": "",
    "providerKeyName": "k8s",
    "providerKeyVersion": ""
}
```

The relevant fields containing the credentials are `aadClientId` and `aadClientSecret`.

I was curious, however, as to the permissions on the file:

```text
/ # ls -l /etc/kubernetes
total 4
-rw-------    1 root     root          1173 Jul 24 19:13 azure.json
```

As suspected, the file is only readable by containers running as root.