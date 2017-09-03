---
title: Updating apps with PowerShell 5.0 and Chocolatey
tags: [Chocolatey, PowerShell]
excerpt_separator: "Find-Package"
---

## An introduction to the PackageManagement module

If you are using Windows 10 or if you have installed the Windows Management Framework 5.x [available here](https://www.microsoft.com/en-us/download/details.aspx?id=54616), you may have noticed a PowerShell module named `PackageManagement`.  

This is the new name for what was called `OneGet` in previous versions of the <abbr title="Windows Management Framework">WMF</abbr> 5.0. It contains the following cmdlets :  

```powershell
C:\> (Get-Command -Module PackageManagement).Name
Find-Package
Find-PackageProvider
Get-Package
Get-PackageProvider
Get-PackageSource
Import-PackageProvider
Install-Package
Install-PackageProvider
Register-PackageSource
Save-Package
Set-PackageSource
Uninstall-Package
Unregister-PackageSource
```

So, what is this ?  
This is a package manager manager. No, you are not seeing double.  
It really is a manager of package managers, in other words, a framework to integrate multiple package managers.  

These package managers are called "PackageProviders" in OneGet terminology :

```powershell
C:\> Get-PackageProvider

Name                     Version          DynamicOptions
----                     -------          --------------
Chocolatey               2.8.5.130        SkipDependencies, ContinueOnFailure, ExcludeVersion, ForceX86...
msi                      3.0.0.0          AdditionalArguments
msu                      3.0.0.0
NuGet                    2.8.5.204        Destination, ExcludeVersion, Scope, Headers, FilterOnTag, Con...
PowerShellGet            1.0.0.1          PackageManagementProvider, Type, Scope, AllowClobber, SkipPub...
Programs                 3.0.0.0          IncludeWindowsInstaller, IncludeSystemComponent
```  

One of these awesome package managers is [Chocolatey](https://chocolatey.org/).  
Chocolatey is very popular and using its provider for PackageManagement gives us access to a software catalog of almost 3000 packages !

The Chocolatey provider is not installed by default. But fear not, it can be installed by just answering `Y` to the following prompt :

```powershell
C:\> Find-Package -ProviderName Chocolatey

The provider 'chocolatey v2.8.5.130' is not installed.
chocolatey may be manually downloaded from https://oneget.org/ChocolateyPrototype-2.8.5.130.exe and
installed.
Would you like PackageManagement to automatically download and install 'chocolatey' now?
[Y] Yes  [N] No  [S] Suspend  [?] Help (default is "Y"):
```

Now, let's install stuff !  
We can search in the Chocolatey gallery using the cmdlet `Find-Package` , like so :

```powershell
C:\> Find-Package -Source Chocolatey -Name NotepadPlusPlus -MinimumVersion 7.3 -AllVersions

Name                           Version          Source           Summary
----                           -------          ------           -------
notepadplusplus                7.3              chocolatey       Notepad++ is a free (as in free speec...
notepadplusplus                7.3.1            chocolatey       Notepad++ is a free (as in free speec...
notepadplusplus                7.3.2            chocolatey       Notepad++ is a free (as in free speec...
notepadplusplus                7.3.3            chocolatey       Notepad++ is a free (as in free speec...
notepadplusplus                7.4              chocolatey       Notepad++ is a free (as in free speec...
notepadplusplus                7.4.1            chocolatey       Notepad++ is a free (as in free speec...
notepadplusplus                7.4.2            chocolatey       Notepad++ is a free (as in free speec...
```

We see above that there are different versions for this package but we don't have to worry about this, unless we want a specific version of a package.  Without the parameter `AllVersions`, this gets only the latest stable version of any given package.

Now, we install the latest stable version of Notepad++ :

```powershell
C:\> Install-Package -Source Chocolatey -Name 'NotepadPlusPlus'

Name                           Version          Source           Summary
----                           -------          ------           -------
chocolatey-core.extension      1.3.1            chocolatey       Helper functions extending core choco ...
notepadplusplus.install        7.4.2            chocolatey       Notepad++ is a free (as in free speec...
notepadplusplus                7.4.2            chocolatey       Notepad++ is a free (as in free speec...
```


So, we can manage the installation of one or multiple software packages right from PowerShell.  
This is nice, but how do we keep them up-to-date ?

As we have seen at the beginning of the post, there is a `Install-Package` cmdlet, a `Uninstall-Package` cmdlet, but there is no `Update-Package` cmdlet.  According to <a href="https://github.com/OneGet/oneget/issues/58">this issue in the project page</a>, this may be coming relatively soon.  

In the meantime, let's roll on own.

## Updating Chocolatey packages with PowerShell

Let's say we have a bunch of apps which were installed from Chocolatey with `Install-Package`, and if they are not up-to-date, we want to update them to the latest stable version available in the [Chocolatey gallery](https://chocolatey.org/packages).

Here is what we currently have :

```powershell
C:\> Get-Package -ProviderName Chocolatey

Name                           Version          Source                           ProviderName
----                           -------          ------                           ------------
chocolatey-core.extension      1.3.1            C:\Chocolatey\lib\chocolatey-... Chocolatey
gitkraken                      2.0.1            C:\Chocolatey\lib\gitkraken.2... Chocolatey
notepadplusplus                7.4.2            C:\Chocolatey\lib\notepadplus... Chocolatey
notepadplusplus.install        7.4.2            C:\Chocolatey\lib\notepadplus... Chocolatey
```

The first thing we need to do is compare the currently installed version with the latest stable version in the Chocolatey gallery for each package :  

```powershell
C:\> $InstalledPackages = Get-Package -ProviderName Chocolatey
C:\> $LatestPackages = Find-Package -Source Chocolatey -Name $InstalledPackages.Name
C:\> Compare-Object $InstalledPackages $LatestPackages -Property Version

Version SideIndicator
------- -------------
2.4.0   =>
2.0.1   <=
```

As you can see above, `Compare-Object` is not going to help us very much.  
It is only telling us when a version number from one side is not found on the other side.  

What we want to know is : for each installed package, is the version number lower than the version number of the latest version in the Chocolatey gallery ?

To simplify our experimentations, we are going to work on a single package. When we are done, we can use a `foreach` loop to extend the logic to multiple packages, so it's not a big deal.  
Let's work on GitKraken :  

```powershell
C:\> $InstalledPackage = Get-Package -ProviderName Chocolatey -Name 'GitKraken'
C:\> $LatestPackage = Find-Package -Source Chocolatey -Name 'GitKraken'
C:\> $InstalledPackage.Version
2.0.1
C:\> $LatestPackage.Version
2.4.0
```

Here, we see that our currently installed version of GitKraken is not the latest version available.  
Now, how can we programmatically and reliably determine that ?

We also see that on both sides the value of the Version property is a string. So we'll need to compare both strings using regular expression.  

> Woohoo !!  

Did you feel the irony ? I thought so.

Comparing version numbers **reliably** and taking into account all the possible versioning schemes using regex is feasible but very painful.  
As I said before, if you are parsing text in PowerShell, there is probably a better way.

The better way in this case, is to cast our miserable strings to powerful objects of the .NET type `[Version]` :  

```powershell
C:\> [Version]$InstalledPackage.Version

Major  Minor  Build  Revision
-----  -----  -----  --------
2      0      1      -1

C:\> [Version]$LatestPackage.Version

Major  Minor  Build  Revision
-----  -----  -----  --------
2      4      0      -1

C:\> $InstalledVersion = [Version]$InstalledPackage.Version
C:\> $LatestVersion = [Version]$LatestPackage.Version
C:\> $InstalledVersion -lt $LatestVersion
True
```

Thanks to the .NET Framework class `[System.Version]`, we can simply use a comparison operator (`-lt` here) to reliably tell if the currently installed package has a lower version number than the latest in the Chocolatey gallery.

If this returns `True` (meaning the installed package is not up-to-date), we update it from the Chocolatey gallery :

```powershell
If ( $InstalledVersion -lt $LatestVersion ) {
    Install-Package -InputObject $LatestPackage
}
Else {
    Write-Output "$($CurrentPackage.Name) is up-to-date"
}

Name                           Version          Source           Summary
----                           -------          ------           -------
gitkraken                      2.4.0            chocolatey       The intuitive, fast, and beautiful cross-platform Git client.

```

The `If` statement evaluates to `True` so it installs the latest version of the package from the Chocolatey gallery.  

That's it.  
I have encapsulated the same logic in a function called `Update-ChocolateyPackage`.  
It can update all the Chocolatey packages, or only the package(s) specified with a `Name` parameter.  
You can [grab it here](https://github.com/MathieuBuisson/Powershell-Utility/tree/master/Update-ChocolateyPackage).  

Also, it can be used to check the Chocolatey packages for updates, without actually updating anything.  
This can be done by adding the parameter `WhatIf`. The output "What if" information is only in the case where a package is not up-to-date, so no output means that all packages are up-to-date.
