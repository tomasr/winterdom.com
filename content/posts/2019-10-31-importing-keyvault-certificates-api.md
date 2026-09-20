---
layout: post
category: Azure
title: Importing Certificates into Azure Key Vault using the API
tags:
- Azure
- KeyVault
- Security
comments: []
---

I spent some time the last two days figuring out how to correctly import X.509
certificates into an Azure [Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/) instance using 
the API (through the [Microsoft.Azure.KeyVault](https://www.nuget.org/packages/Microsoft.Azure.KeyVault)
NuGet package), and ran into a few issues.

Unfortunately, neither the library, nor the underlying REST API are very well documented, so wanted to
write this post to document the gotchas I ran into, in case it's useful to anyone.

## PEM Certificate Format

The [Import Certificate](https://docs.microsoft.com/en-us/rest/api/keyvault/importcertificate/importcertificate)
API (and corresponding `KeyVault.ImportCertificate()` method) are documented as accepting the certificate
to import in both `PFX` and `PEM` formats. It took me a while to figure out the right incantation
to use for a `PEM` file, however.

There are a few separate issues here you need to be very careful about:

* __Private Key Format__: A certificate with a private key in a PEM file could have the key stored
  in various format. One very common one is `PKCS#1`, which is identified by the key being wrapped in
  `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`.

  If you try to import such a certificate to Key Vault, however, you will get an error. This is because
  Key Vault will only accept a key in `PKCS#8` format, which you will recognize because it's wrapped
  in `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`.

  You can easily use the `openssl pkcs8 -topk8` command to convert the private key once you know to do this.

  This aspect is not documented on the API, but it is mentioned in passing in the
  (Key Vault documentation)[https://docs.microsoft.com/en-us/azure/key-vault/certificate-scenarios#formats-of-import-we-support].

* __Content Type__: If you're going to import a `PEM` certificate, you also need to set the `policy.secret_props.contentType`
  property to the right type:

  ```cs
  var policy = new CertificatePolicy {
    SecretProperties = new SecretProperties {
      ContentType = "application/x-pem-file"
    }
  };
  ```

* __Value Format__: The second confusing part I ran into here is how to actually send the `PEM` data to
  KeyVault. The API documentation states that the `value` parameter is `Base64 encoded representation of the certificate object to import.` This is only partially correct.

  If you're importing a certificate in `PFX` format, this is correct. `PFX` is a binary format, so you need to
  base64-encode the value before providing it to Key Vault. `PEM`, however, is already a text format, so
  base64-encoding it will make no sense.

  The result is that the `value` parameter will just be the raw text contents of your `PEM` file. With one
  major, undocumented gotcha: The content __must__ use UNIX-style line separators (`\n`). Attempting to
  send the content using Windows-style line endings (`\r\n`) will just result in a confusing error
  such as `The specified PEM X.509 certificate content is in an unexpected format. Please check if certificate is in valid PEM format`.

  The only way I was able to figure out this little detail was by reading the [Azure CLI](https://github.com/azure/azure-cli)
  source code.

## Updating Certificates

Another interesting scenario I ran into was attempting to import a new certificate version on top of an
existing certificate as a new version. The documentation for the
[Import Certificate](https://docs.microsoft.com/en-us/rest/api/keyvault/importcertificate/importcertificate)
API doesn't actually say if this is possible, but since the Azure Portal actually allows you to do it,
I figured it would be a safe bet that it would work.

It is, indeed, possible to do this. However, there was one surprising error I ran into while testing this out.

Purely by coincidence, I tried importing a certificate that had a 4096-bit key as a new version of a previous
certificate that had a 2048-bit key. Trying this out failed with a `CONFLICT` error. Digging deeper, I found
out that the actual error message was `Expected KeySize is 4096 but was 2048`.

This made no sense at first, until I realized that Key Vault was apparently attempting to somehow reuse the key of the
current certificate version rather than the one included in the `Import Certificate` call.

The way to avoid this error appears to be to explicitly set the `policy.key_props.key_size` parameter to the right
value when attempting to import the new certificate version on top of the old one:

```cs
var policy = new CertificatePolicy {
  Attributes = new CertificateAttributes {
    Enabled = true
  },
  SecretProperties = new SecretProperties {
    ContentType = "application/x-pem-file"
  },
  KeyProperties = new KeyProperties {
    Exportable = true,
    ReuseKey = false,
    KeySize = theCertificate.PublicKey.Key.KeySize
  }
};
```

Hope you find this useful!