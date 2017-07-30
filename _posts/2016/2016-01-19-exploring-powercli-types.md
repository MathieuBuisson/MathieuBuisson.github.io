---
title: Exploring the types exposed by PowerCLI
tags: [PowerCLI]
---

One of the things I love about PowerShell, is that once we know the fundamentals, we can learn the rest on our own, by just exploring and experimenting. As I like to tell people, discoverability is **the number 1** feature of PowerShell.

So let's see how we can explore PowerCLI assemblies and the object types they expose.

> What is an assembly ?  

PowerCLI is packaged as a bunch of PowerShell modules (snapins as well, but these are an endangered species so let's focus on modules).  
There are 2 broad types of modules :  
  - Script modules  
  - Binary modules  
  
Script modules are written in PowerShell and have a .psm1 file extension.  
Binary modules are written in C# and are .NET Framework assemblies (.dll).

In the case of PowerCLI, the modules are binary. Well, this is not totally accurate, due to the [transition of PowerCLI from snapins to modules](https://blogs.vmware.com/PowerCLI/2015/03/powercli-6-0-introducing-powercli-modules.html).  

For example, let's look at the main module : `VMware.VimAutomation.Core`.

```powershell
C:\> Get-Module -Name VMware.VimAutomation.Core |
Format-List Name,ModuleType,Path

Name       : VMware.VimAutomation.Core
ModuleType : Script
Path       : C:\Program Files (x86)\VMware\Infrastructure\vSphere
             PowerCLI\Modules\VMware.VimAutomation.Core\VMware.VimAutomation.Core.ps1
```

This is telling us that `VMware.VimAutomation.Core` is just a script module.  
But looking at the content of the script `VMware.VimAutomation.Core.ps1`, we see that its main purpose is to load the necessary dlls and the good old snapin :

```powershell
$dllToLoad |%{    
    $dllPath = [System.IO.Path]::Combine($coreAssembliesPath, $_)
    # Load DLL
    [Void] [Reflection.Assembly]::LoadFile($dllPath)
}

$snapinName = "VMware.VimAutomation.Core"
if (!(Get-PSSnapin $snapinName -ErrorAction Ignore)) {	  
		Add-PSSnapin $snapinName		
}
```

And the snapin itself is a dll.  
Here is how to list all the .NET assemblies PowerCLI is made of (output truncated for brevity):

```powershell
C:\> $PowerCliPath = 'C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI'
C:\> $PowerCliDlls = Get-ChildItem -Path $PowerCliPath -Recurse -Filter "*.dll"
C:\> $PowerCliDlls.FullName

C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\CryptoSupport.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\ICSharpCode.SharpZipLib.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\Interop.Shell32.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\msvcr90.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.Binding.Ls2.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.Vim.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.Sdk.Impl.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.Sdk.Interop.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.Sdk.Types.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.Sdk.Util10.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.Sdk.Util10Ps.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.ViCore.Cmdlets.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.ViCore.Impl.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.ViCore.Interop.dll
C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.ViCore.Types.dll

C:\> $PowerCliDlls.Count
56
```

There are 56 of them.  

>  How many of them are currently loaded in our PowerShell session ?  

```powershell
C:\> $LoadedAssemblies = [AppDomain]::CurrentDomain.GetAssemblies()
C:\> $CliLoadedAssemblies = $LoadedAssemblies | Where-Object Location -Like "*PowerCLI*"
C:\> $CliLoadedAssemblies.Count
46
```

We normally never need to load these assemblies manually but, if we **really** want to, here is how we would load the assembly `VMware.Vim.dll` :

```powershell
C:\> [Reflection.Assembly]::LoadFrom("$PowerCliPath\VMware.Vim.dll")

GAC    Version        Location
---    -------        --------
False  v4.0.30319     C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.Vim.dll
```

Now, let's look into the types exposed by these PowerCLI assemblies :

```powershell
C:\> $CliLoadedAssemblies.ExportedTypes | more

IsPublic IsSerial Name                                     BaseType
-------- -------- ----                                     --------
True     False    ICredentialStore
True     False    CredentialStoreFactory                   System.Object
True     False    DistinguishedName                        System.Object
True     False    DnKeyListSdk                             System.Object
True     False    LocalizableMessage                       System.Object
True     False    VimException                             System.ApplicationException
True     False    ViError                                  VMware.VimAutomation.Sdk.Types.V1.ErrorHandlin...
True     False    MethodFault                              VMware.VimAutomation.Sdk.Types.V1.ErrorHandlin...
True     False    ObnRecordProcessingFailedException       VMware.VimAutomation.Sdk.Types.V1.ErrorHandlin...
True     False    ServerObnFailureException                VMware.VimAutomation.Sdk.Types.V1.ErrorHandlin...
True     True     ErrorCategory                            System.Enum
True     True     VimExceptionSeverity                     System.Enum
True     False    ViServerConnectionException              VMware.VimAutomation.Sdk.Types.V1.ErrorHandlin...
True     False    NamedObject
True     False    Range                                    System.Object
True     False    SnapinVersion
True     False    VIObjectCore
True     False    VIObject
True     False    Task
True     True     TaskState                                System.Enum
```

We use the `more `command, otherwise the output would go on and on, for thousands of lines.  
There are thousands of types, so let's break down the number of types by assembly to have an idea of which assemblies are exposing the most types :

```powershell
C:\> $CliLoadedAssemblies |
>> Select-Object -Property @{Label='Module';Expression={ $_.Modules }}, @{Label='TypesCount';Expression={ ($_.ExportedTypes).Count }} |
>> Sort-Object -Property TypesCount -Descending | Select-Object -First 15

Module                                    TypesCount
------                                    ----------
IntegritySoapService40.dll                      2986
SmsProxyService.dll                             2085
VMware.VimAutomation.ViCore.Types.dll            976
VMware.VimAutomation.ViCore.Impl.dll             537
VMware.VimAutomation.ViCore.Cmdlets.dll          415
IntegritySoapService40.XmlSerializers.dll        380
VMware.VimAutomation.ViCore.Interop.dll          220
VMware.VimAutomation.VROps.Views.dll             159
SpbmProxyService.dll                             159
VMware.VimAutomation.VROps.Schema.dll            146
ICSharpCode.SharpZipLib.dll                      101
VMware.VumAutomation.Types.dll                    69
VMware.VimAutomation.Sdk.Util10.dll               54
VMware.Binding.Ls2.dll                            53
VMware.VimAutomation.Vds.Types.dll                52
```

`VMware.VimAutomation.ViCore.Types.dll` looks interesting, we can check if it contains the type of some objects we use on a daily basis, like datastore and VMHost :

```powershell
C:\> ($CliLoadedAssemblies | Where-Object Location -Like "*.ViCore.Types.dll").ExportedTypes |
>> Where-Object { $_.Name -eq 'Datastore' -or $_.Name -eq 'VMHost' } |
>> Format-List -Property 'Name', 'Attributes'

Name       : Datastore
Attributes : AutoLayout, AnsiClass, Class, Public, ClassSemanticsMask, Abstract

Name       : VMHost
Attributes : AutoLayout, AnsiClass, Class, Public, ClassSemanticsMask, Abstract
```

Indeed, they are here.  
By the way, there is better way to find which assembly is providing a given type :

```powershell
C:\> $DatastoreType = (Get-Datastore -Name 'ISCSI-1').GetType()
C:\> ([reflection.assembly]::GetAssembly($DatastoreType)).Location

C:\Program Files (x86)\VMware\Infrastructure\vSphere PowerCLI\VMware.VimAutomation.ViCore.Impl.dll
```

We had seen earlier that the `[Datastore]` type was defined in `VMware.VimAutomation.ViCore.Types.dll`, and now we are told that it is in `VMware.VimAutomation.ViCore.Impl.dll`. What is going on ?

```powershell
C:\> (Get-Datastore -Name "ISCSI-1").GetType() | Select-Object -Property FullName

FullName
--------
VMware.VimAutomation.ViCore.Impl.V1.DatastoreManagement.VmfsDatastoreImpl
```

Aha, `Get-Datastore` is returning objects of the type `[VmfsDatastoreImpl]`, not `[Datastore]`.

We can check if this assembly defines other datastore-related types, like so :

```powershell
C:\> ($CliLoadedAssemblies | Where-Object Location -Like "*.ViCore.Impl.dll" }).ExportedTypes |
>> Where-Object { $_.Name -like "*datastore*" -and $_.BaseType } |
>> Select-Object -Property 'Name', 'BaseType'

Name                    BaseType
----                    --------
DatastoreItemImpl       VMware.VimAutomation.ViCore.Util10.VersionedObjectImpl
DatastoreFolderImpl     VMware.VimAutomation.ViCore.Impl.V1.DatastoreManagement.DatastoreItemImpl
DatastoreRootFolderImpl VMware.VimAutomation.ViCore.Impl.V1.DatastoreManagement.DatastoreFolderImpl
DatastoreImpl           VMware.VimAutomation.ViCore.Impl.V1.DatastoreManagement.StorageResourceImpl
NasDatastoreImpl        VMware.VimAutomation.ViCore.Impl.V1.DatastoreManagement.DatastoreImpl
VmfsDatastoreImpl       VMware.VimAutomation.ViCore.Impl.V1.DatastoreManagement.DatastoreImpl
DatastoreFileImpl       VMware.VimAutomation.ViCore.Impl.V1.DatastoreManagement.DatastoreItemImpl
DatastoreVMDiskFileImpl VMware.VimAutomation.ViCore.Impl.V1.DatastoreManagement.DatastoreFileImpl
DatastoreServiceImpl    System.Object
```

Yes, it does.  
We can actually see that it defines one type for VMFS datastores (`VmfsDatastoreImpl`) and one type for NFS datastores (`NasDatastoreImpl`), both of which are child types (derived classes in C# parlance) of the type `DatastoreImpl`.

Also, as we can see below, the `[Datastore]` type is an abstract class :

```powershell
C:\> 'Datastore' -as [type] | Select-Object -Property 'Name', 'Attributes'

Name                                            Attributes
----                                            ----------
Datastore AutoLayout, AnsiClass, Class, Public, Abstract
```

> What is an abstract class ?  

Basically, we cannot create instances of the class (objects) when the class is abstract.  
Generally abstract classes are used as a generic template for derived classes. Then, objects are created from a derived **concrete** class.  
Concrete means that we can create instances of it.

So we can assume that `VMware.VimAutomation.ViCore.Types.dll` is providing base classes for use by other PowerCLI assemblies, to create more specific classes from which we can create objects.
