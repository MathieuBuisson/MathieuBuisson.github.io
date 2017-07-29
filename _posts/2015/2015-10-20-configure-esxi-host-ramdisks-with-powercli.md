---
title: Configure ESXi host RAMdisks with PowerCLI
tags: [PowerCLI, vSphere]
---

The symptoms of a full RAMdisk on a ESXi host can be pretty nasty and diverse. The possible causes are also very diverse (search for `ramdisk full` in [the VMware Knowledge Base](http://kb.vmware.com), you will see what I mean).  

Also, it can be affecting the RAMdisk `root`, `tmp`, or even `hostdstats` depending on the cause, so this is not easy to troubleshoot.

To help prevent this type of issues, we can increase the size of ESXi RAMdisks by increasing their memory reservation, memory limit and set their reservation as "expandable", just like in resource pools.

This corresponds to settings in **System Resource Allocation** :  

![System resources allocation]({{ site.url }}/images/2015-10-20-configure-esxi-host-ramdisks-with-powercli-resources.png)  

Let's see how we can configure this in a more automated way, with PowerCLI.

```powershell
PS C:\> $ESXiHosts = Get-VMHost
PS C:\> $Spec = New-Object VMware.Vim.HostSystemResourceInfo
```

Here, we save all our ESXi Hosts into a variable for later use, because we want to configure all the ESXi hosts in the vCenter.  
We also create a new, empty `HostSystemResourceInfo` object, which we are going to populate with the memory settings we want.  

Now, the tricky part is to use the appropriate key, depending on the RAMdisk we want to configure. This can be one of 3 possible RAMdisks that we might want to configure, so this is a good candidate for a `Switch` statement :  

```powershell
PS C:\> $RamDisk = 'tmp'
PS C:\> switch ($RamDisk) {
    'tmp' {$Spec.Key = "host/system/kernel/kmanaged/visorfs/tmp"}
    'root' {$Spec.Key = "host/system/kernel/kmanaged/visorfs/root"}
    'hostdstats' {$Spec.Key = "host/system/kernel/kmanaged/visorfs/hostdstats"}
}
```

As an example, we are going to configure the `tmp` RAMdisk.  

Then, we create a new, empty `ResourceConfigSpec` object and store it into our Config property :

```powershell
PS C:\> $Spec.Config = New-Object VMware.Vim.ResourceConfigSpec
PS C:\> $Spec.Config

Entity           :
ChangeVersion    :
LastModified     :
CpuAllocation    :
MemoryAllocation :
LinkedView       :
DynamicType      :
DynamicProperty  :
```

Even though, the CPU allocation is not applicable to a RAMdisk, we need to create one and assign it to the `CpuAllocation` property of our `ResourceConfigSpec`.  
Why ? Because the vSphere API won't let us apply the `ResourceConfigSpec` to a host, if the `CpuAllocation` or the `MemoryAllocation` property is null.

```powershell
PS C:\> $Spec.Config.cpuAllocation = New-Object VMware.Vim.ResourceAllocationInfo
```

Now, let's set the memory reservation to 30 MB, the limit to 400 MB and the reservation as expandable.  
Expandable reservation means that more than the reservation can be allocated to the RAMdisk if there are available resources in the parent resource pool.

```powershell
PS C:\> $Spec.Config.memoryAllocation = New-Object VMware.Vim.ResourceAllocationInfo
PS C:\> $Spec.Config.memoryAllocation.Reservation = 30
PS C:\> $Spec.Config.memoryAllocation.Limit = 400
PS C:\> $Spec.Config.memoryAllocation.ExpandableReservation = $True
```

Now, it's time to apply the configuration to each individual ESXi host :

```powershell
Foreach ( $ESXiHost in $ESXiHosts ) {
    $Spec.Config.ChangeVersion = $ESXiHost.ExtensionData.SystemResources.Config.ChangeVersion
    $ESXiHost.ExtensionData.UpdateSystemResources($Spec)
}
```

> What is this `ChangeVersion` business ?  

We get the version identifier of the current ESXi host configuration and we make sure the `ChangeVersion` property in our `ResourceConfigSpec` matches with it.  
This is to prevent problems in case the ESXi host configuration was changed between the moment we last read it and the moment we apply a new `ResourceConfigSpec` to it.  
For more information, you can refer to [this documentation page](https://vdc-repo.vmware.com/vmwb-repository/dcr-public/bd170cdc-e03a-4701-b468-bcfba05da6b2/946a76df-5276-46fa-a10d-06f0f7d4078e/doc/vim.ResourceConfigSpec.html).  

Lastly, we apply the resource allocation settings contained in our `$Spec`, using the method `UpdateSystemResources` of our HostSystem view (we used the `ExtensionData` property above, but it is the same as a view).

## Putting it all together

Using these techniques, I wrote a function called `Set-VMHostRamDisk` and packaged it in a module [available here](https://github.com/MathieuBuisson/Powershell-VMware/tree/master/Set-VMHostRamDisk).  

It is fully parameterized and accepts one or multiple ESXi hosts from the pipeline.  
I took the time to write a proper comment-based help, so if you need more information on how to use the function, `Get-Help` is your BFF.
