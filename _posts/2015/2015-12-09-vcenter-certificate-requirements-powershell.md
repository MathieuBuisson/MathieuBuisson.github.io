---
title: Checking vCenter Server certificate requirements with PowerShell
tags: [PowerShell, vSphere]
---

Given the number and the complexity of certificate-related issues we get at VMware Support, I wanted an automated way to check whether a certificate file meets the vCenter Server certificate requirements.  

There are 2 ways to extract the necessary information from a certificate file : `openssl.exe` and the cmdlet `Get-PfxCertificate`, which was introduced with PowerShell 3.0.  

Here is the `Get-PfxCertificate` command and its output :

```powershell
C:\> Get-PfxCertificate $env:USERPROFILE\Desktop\bob.crt | fl *

EnhancedKeyUsageList : {}
DnsNameList          : {bob}
SendAsTrustedIssuer  : False
Archived             : False
Extensions           : {System.Security.Cryptography.Oid, System.Security.Cryptography.Oid,
                       System.Security.Cryptography.Oid, System.Security.Cryptography.Oid}
FriendlyName         :
IssuerName           : System.Security.Cryptography.X509Certificates.X500DistinguishedName
NotAfter             : 4/25/2022 11:54:40 AM
NotBefore            : 4/27/2012 11:54:40 AM
HasPrivateKey        : False
PrivateKey           :
PublicKey            : System.Security.Cryptography.X509Certificates.PublicKey
RawData              : {48, 130, 6, 37...}
SerialNumber         : 02
SubjectName          : System.Security.Cryptography.X509Certificates.X500DistinguishedName
SignatureAlgorithm   : System.Security.Cryptography.Oid
Thumbprint           : 921B97842F23474D8961BFD54911C298316AA558
Version              : 3
Handle               : 2017101374016
Issuer               : E=contact@freelan.org, CN=Freelan Sample Certificate Authority, OU=freelan,
                       O=www.freelan.org, L=Strasbourg, S=Alsace, C=FR
Subject              : E=contact@freelan.org, CN=bob, OU=freelan, O=www.freelan.org, S=Alsace, C=FR
```

I wrote a PowerShell function named `Test-VpxdCertificate`, which checks if a certificate file (.crt or .cer) meets all the requirements.  
I chose to build this tool upon the `Get-PfxCertificate` cmdlet for 2 main reasons :  
  - `openssl` returns plain text and you know what I think about text-parsing in PowerShell  
  - You don't really need to have PowerShell 3.0 on the vCenter Server itself. You can copy the certificate file to another machine (which has PowerShell 3.0 or later) and run the cmdlet from there.  

## What does it check ?  

The vCenter Server certificate requirements are not clearly and exhaustively documented. There is something in the <a href="https://pubs.vmware.com/vsphere-50/topic/com.vmware.vsphere.solutions.doc_50/GUID-68120C82-B3D1-4ED6-8497-5A1329E73C2F.html">vSphere 5.0 documentation</a>, but this is old and not exhaustive.  
Fortunately, we can deduce most of the requirements from the [KB article](http://kb.vmware.com/kb/2061934) explaining how to create certificate requests for custom certificates.

So here are the certificate requirements **for vCenter Server 5.x** :  
  - Certificate must be X.509 v3
  - Certificate should begin with : "-----BEGIN CERTIFICATE-----"
  - Certificate should end with : "-----END CERTIFICATE-----"
  - The subject Alternative Name must contain the FQDN of the vCenter server
  - The certificate must be valid : the current date must be between the "Valid from" date and the "Valid to" date
  - The Key usage must contain : Digital Signature, Key Encipherment, Data Encipherment
  - The Enhanced key usage must contain : "Server Authentication" and "Client Authentication"
  - The public key algorithm must be : RSA (2048 Bits)
  - The certificate must NOT be a wildcard certificate
  - The signature hash algorithm must be SHA256, SHA384, or SHA512  

And here are the requirements **for vCenter Server 6.0** :  

  - Certificate must be X.509 v3
  - Certificate should begin with : "-----BEGIN CERTIFICATE-----"
  - Certificate should end with : "-----END CERTIFICATE-----"
  - The subject Alternative Name must contain the FQDN of the vCenter server
  - The certificate must be valid : the current date must be between the "Valid from" date and the "Valid to" date
  - The Key usage must contain : Digital Signature, Key Encipherment
  - The public key algorithm must be : RSA (2048 Bits)
  - The certificate must NOT be a wildcard certificate
  - The signature hash algorithm must be SHA256, SHA384, or SHA512  

## How to use it :  

```powershell
C:\> $CertPath = "$env:USERPROFILE\Desktop\bob.crt"
C:\> $vCenterName = 'bob'
C:\> Test-VpxdCertificate -CertFilePath $CertPath -vCenterServerFQDN $vCenterName -VpxdVersion 5.x

Certificate ends with "-----END CERTIFICATE-----"             : True
Certificate is NOT a wildcard certificate                     : True
Signature hash algorithm is SHA256 or higher                  : False
Certificate is X.509 v3                                       : True
Certificate has the required key usages                       : False
Certificate begins with "-----BEGIN CERTIFICATE-----"         : False
Certificate has the required enhanced key usages              : False
Public key algorithm is RSA 2048 or higher                    : True
Subject alternative names contain the vCenter FQDN            : False
Current date is between the "Valid from" and "Valid to" dates : True
```

Here, we specified the certificate file path and the vCenter FQDN because this was not run from the vCenter Server itself.
If we run this command from the vCenter Server and  if it is able to resolve its own FQDN, then there is no need to use the `vCenterFQDN` parameter.  

If we run this command from the vCenter Server and if the certificate is at its default location, then there is no need to use the `CertFilePath` parameter.

The function performs a test for each of the requirements listed above and outputs an object with a property corresponding to each of these tests.  

The value of each property is either `True` or `False`. `True` means that the certificate passed the corresponding test and `False` means that it failed the test.

As we have seen above, the vCenter Server certificate requirements are different between vCenter 5.x and 6.0.
So the `VpxdVersion` parameter is used to specify the version of vCenter Server and the value of this parameter determines which tests are performed.  

If the function is run from the vCenter Server itself, it will detect the vCenter version by itself and use this value, unless it is explicitly specified via the `VpxdVersion` parameter.

By the way, the parameters `CertFilePath`, `vCenterServerFQDN` and `VpxdVersion` are positional, so we can save some typing, like so :

```powershell
C:\> Test-VpxdCertificate $CertPath $vCenterName '5.x'
```

As we saw above, it seems that the certificate of our vCenter "bob" doesn't meet some requirements.  

To have better insight into why a certificate failed a test, we can use the `Verbose` parameter. This allows us to see the certificate properties which are checked and their values :

```powershell
C:\> Test-VpxdCertificate $CertPath $vCenterName '5.x' -Verbose
VERBOSE: $VpxdVersion : 5.x
VERBOSE: $CertificateType : X509Certificate2
VERBOSE: $X509 : True
VERBOSE: Version : 3
VERBOSE: $Version : True
VERBOSE: $FirstLine : Certificate:
VERBOSE: $LastLine : -----END CERTIFICATE-----
VERBOSE: $ValidFrom : 4/27/2012 11:54:40 AM
VERBOSE: $ValidTo : 4/25/2022 11:54:40 AM
VERBOSE: Key Usages :
VERBOSE: Required key usages : KeyEncipherment, DigitalSignature, DataEncipherment
VERBOSE: ServerAuth Enhanced key usage : False
VERBOSE: ClientAuth Enhanced key usage : False
VERBOSE: Public key size : 4096
VERBOSE: $KeySize2048Bits : True
VERBOSE: Public key algorithm : RSA-PKCS1-KeyEx
VERBOSE: $PublicKeyAlgorithm : True
VERBOSE: Certificate CN :  CN=bob
VERBOSE: Signature hash algorithm : sha1RSA

Certificate ends with "-----END CERTIFICATE-----"             : True
Certificate is NOT a wildcard certificate                     : True
Signature hash algorithm is SHA256 or higher                  : False
Certificate is X.509 v3                                       : True
Certificate has the required key usages                       : False
Certificate begins with "-----BEGIN CERTIFICATE-----"         : False
Certificate has the required enhanced key usages              : False
Public key algorithm is RSA 2048 or higher                    : True
Subject alternative names contain the vCenter FQDN            : False
Current date is between the "Valid from" and "Valid to" dates : True
```

Now, we can see why it failed the test for enhanced key usage : it has none of the required key usage and enhanced key usages.

On the other side of the verbosity spectrum, we can just output a boolean value : `True` or `False` using the `Quiet` parameter.  
`True` means that the specified certificate meets all the requirements, `False` means that it doesn't meet all the requirements :  

```powershell
C:\> Test-VpxdCertificate $CertPath $vCenterName '5.x' -Quiet
False
```

This behaviour is conform to the `Quiet` parameter of `Test-Connection` and other `Test-*` cmdlets.  
This is useful mostly when we call the cmdlet from another automation tool and we do something, depending on the result (`True` or `False`).

As usual, I packaged the function in a nice little module, which is [available here](https://github.com/MathieuBuisson/Powershell-VMware/tree/master/Test-VpxdCertificate).
