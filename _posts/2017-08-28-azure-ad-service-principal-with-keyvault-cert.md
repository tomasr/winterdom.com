---
layout: post
category: Azure
title: Azure AD Service Principal with a Key Vault Certificate 
tags:
- Azure
- AzureAD
- KeyVault
comments: []
---
It is often useful to create Azure Active Directory [Service Principal](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-application-objects)
objects for authenticating applications and automating tasks in Azure.

While you can authenticate a Service Principal using a password (client secret),
it might be better to use an X509 certificate as an alternative. You still need to
find a way to keep the certificate secure, though.

That's where Azure [Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/key-vault-whatis)
comes in, allowing you to store the authentication certificate in a secure manner. An
application could then obtain the certificate from Key Vault as needed, or if it's
running in Azure, there might be ways to provision the certificate automatically
so that we don't need to copy stuff around.

You could obtain a certificate from any valid certification authority and store it
safely in Key Vault. However, Key Vault can also generate self-signed certificates,
which might be good enough for many scenarios.

Here is a useful PowerShell script that will create a new self-signed certificate
directly in Key Vault. Then it will create a new service principal in the subscription
tenant, with the new certificate for authentication.

```powershell
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [String]$keyVaultName,
  [Parameter(Mandatory = $true)]
  [String]$principalName,
  [Parameter()]
  [int]$validityInMonths = 12
)

function New-KeyVaultSelfSignedCert {
  param($keyVault, $certificateName, $subjectName, $validityInMonths, $renewDaysBefore)

  $policy = New-AzureKeyVaultCertificatePolicy `
              -SubjectName $subjectName `
              -ReuseKeyOnRenewal `
              -IssuerName 'Self' `
              -ValidityInMonths $validityInMonths `
              -RenewAtNumberOfDaysBeforeExpiry $renewDaysBefore

  $op = Add-AzureKeyVaultCertificate `
              -VaultName $keyVault `
              -CertificatePolicy $policy `
              -Name $certificateName

  while ( $op.Status -ne 'completed' ) {
    Start-Sleep -Seconds 1
    $op = Get-AzureKeyVaultCertificateOperation -VaultName $keyVault -Name $certificateName
  }
  (Get-AzureKeyVaultCertificate -VaultName $keyVault -Name $certificateName).Certificate
}


$certName = "SPCert-$principalName"
$cert = New-KeyVaultSelfSignedCert -keyVault $keyVaultName `
                                   -certificateName $certName `
                                   -subjectName "CN=$principalName" `
                                   -validityInMonths $validityInMonths `
                                   -renewDaysBefore 1

Write-Verbose "Certificate generated $($cert.Thumbprint)"

$certString = [Convert]::ToBase64String($cert.GetRawCertData())

New-AzureRmADServicePrincipal -DisplayName $principalName `
                              -CertValue $certString `
                              -EndDate $cert.NotAfter.AddDays(-1)
```

The script assumes you've already signed in to your Azure Subscription using
`Login-AzureRMAccount`. Let's try executing the script:

![Executing the script](http://static.winterdom.com/images/2017/ad-spwithcert.png)

If we go into the Key Vault in the Azure Portal, we can see the new certificate generated:

![Key Vault Certificate Secret](http://static.winterdom.com/images/2017/kv-certificate.png)

We can also query the new Service Principal and verify that it is indeed setup with 
certificate-based authentication:

```text
Get-AzureRmADSpCredential -ObjectId 37800b1f-5d17-461b-80a3-c4a8df10b319

StartDate            EndDate              KeyId                                Type
---------            -------              -----                                ----
8/28/2017 2:29:54 AM 8/27/2018 2:29:49 AM 8a3250a4-4383-4a5f-acdc-4deafd930e6d AsymmetricX509Cert
```

I'll show some useful scenarios for this in a follow-up post.