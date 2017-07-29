---
title: What's the difference between ToolsVersionStatus and ToolsVersionStatus2
tags: [PowerCLI]
---

Recently, I had a customer who wanted to check if the VMware Tools were installed and up-to-date using PowerCLI.

A relatively easy way to do this is with a VirtualMachine view or the `ExtensionData` of a VM object :

```powershell
PS C:\> $VMView = Get-VM -Name Test-VM | Get-View
PS C:\> $VMView.Summary.Guest

GuestId             :
GuestFullName       :
ToolsStatus         : toolsNotRunning
ToolsVersionStatus  : guestToolsCurrent
ToolsVersionStatus2 : guestToolsCurrent
ToolsRunningStatus  : guestToolsNotRunning
HostName            :
IpAddress           :
DynamicType         :
DynamicProperty     :
```

Looking at the above output, his question was :

> "Should I use ToolsVersionStatus or ToolsVersionStatus2 ?  
> What is the difference between these two ?"

He was using vSphere 5.5, so a good place to start is the [vSphere API Reference Documentation for vSphere 5.5](https://code.vmware.com/apis/197/vsphere). 


But searching in the vSphere API reference is kind of a <em>needle in the haystack</em> thing. So the first thing we need to do is to identify exactly what we are looking for, that is : which object type.  

The .NET method `GetType` is generally good at telling us the exact type of the object we are dealing with, so let's use it :

```powershell
PS C:\> $VMView.Summary.Guest.GetType()

IsPublic IsSerial Name                                     BaseType
-------- -------- ----                                     --------
True     False    VirtualMachineGuestSummary               VMware.Vim.DynamicData
```

So in this case, we need to look for the type `[VirtualMachineGuestSummary]` in the **Data Object Types** section :  

![API Doc]({{ site.url }}/images/2015-10-13-difference-toolsversionstatus-toolsversionstatus2-apidoc.png)  

After locating `VirtualMachineGuestSummary` in the long list of data object types, we can see the properties for this type :  

| Name  | Description |
|---------------------|-------------|
| **toolsVersionStatus**  | **Deprecated**. As of vSphere API 5.0 use toolsVersionStatus2. <br><br>Current version status of VMware Tools in the guest operating system, if known. |
| **toolsVersionStatus2** | Current version status of VMware Tools in the guest operating system, if known. <br><br>**Since** vSphere API 5.0 |  

So the property `toolsVersionStatus` is deprecated and its younger brother should be used if we use the vSphere API 5.0 or later.

This leads more questions :  
> What if the vCenter Server is 5.5 but it has some old 4.x ESXi hosts and I might connect PowerCLI directly to these hosts ?  
> How can I verify which version of the vSphere API I am querying ?

It is pretty simple because we already have a VirtualMachine view `$VMView` and PowerCLI views have a property named `Version` which is nested in `Client` and provides the API version for the current view :

```powershell
PS C:\> $VMView.Client

Version          : Vim55
VimService       : VimApi_55.VimService
ServiceContent   : VMware.Vim.ServiceContent
ServiceUrl       : https://192.168.1.10/sdk
ServiceTimeout   : 100000
CertificateError : System.EventHandler`1[VMware.Vim.CertificateErrorEventArg]
```

So, to verify if the tools are up-to-date or not, taking into account a possible ESXi 4.x host, we could do something like this :

```powershell
If ( $($VMView.Client.Version.ToString()) -like "Vim4*" ) {

    $Props = @{
        Name = $VM.Name
        ToolsVersionStatus = $VM.ExtensionData.Summary.Guest.ToolsVersionStatus
    }
}
Else {
    $Props = @{
        Name = $VM.Name
        ToolsVersionStatus = $VM.ExtensionData.Summary.Guest.ToolsVersionStatus2
    }
}
$CustomObj = New-Object -TypeName PSObject -Property $Props 
```
