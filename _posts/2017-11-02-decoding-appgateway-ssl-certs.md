---
layout: post
category: Azure
title: Decoding Application Gateway Certificates
tags:
- Azure
- ApplicationGateway
comments: []
---
Recently, I wanted to write a PowerShell script that would check expiration on the certificates
assigned for SSL/TLS on Azure [Application Gateway](https://docs.microsoft.com/en-us/azure/application-gateway/application-gateway-introduction)
resources.

Obtaining the certificates is easy through the `SslCertificates` property of the
Application Gateway instance. However, it took me a while to figure out how to
actually extract the base64-encoded data into an `X509Certificate2` instance.

Turns out that the certificate is returned in `PKCS7` format (also known as P7B), so
you need to use the `SignedCms` class to decode it.

Some sample code:

```powershell
function Test-CertExpiresSoon($cert) {
    $span = [TimeSpan]::FromDays(30)
    $today = [DateTime]::Today
    return ($cert.NotAfter - $today) -lt $span
}

function Decode-Certificate($certBytes) {
    $p7b = New-Object System.Security.Cryptography.Pkcs.SignedCms
    $p7b.Decode($certBytes)
    return $p7b.Certificates[0]
}

$gateways = Get-AzureRmApplicationGateway

foreach ($gw in $gateways) {
    foreach ($cert in $gw.SslCertificates) {
        $certBytes = [Convert]::FromBase64String($cert.PublicCertData)
        $x509 = Decode-Certificate $certBytes

        if (Test-CertExpiresSoon $x509) {
            [PSCustomObject] @{
                ResourceGroup = $gw.ResourceGroupName;
                AppGateway = $gw.Name;
                CertSubject = $x509.Subject;
                CertThumbprint = $x509.Thumbprint;
                CertExpiration = $x509.NotAfter;
            }
        }
    }
}
```

A `PKCS7` envelope can contain multiple certificates, so I might have to revisit this
later on in case that is relevant, but it was not an issue in the original scenario.