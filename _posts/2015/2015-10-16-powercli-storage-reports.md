---
title: A PowerCLI alternative to the Storage Reports feature
tags: [PowerCLI, vSphere]
---

As you may know, the Storage Views and Storage Reports features have been removed from vSphere 6.  
Here is the official (and laconic) statement from the [vSphere 6.0 release notes](https://www.vmware.com/support/vsphere6/doc/vsphere-esxi-vcenter-server-60-release-notes.html) :  

> **vSphere Web Client** : The Storage Reports selection from an object's Monitor tab is no longer available in the vSphere 6.0 Web Client.  
> **vSphere Client** : The Storage Views tab is no longer available in the vSphere 6.0 Client.  


Quite a few customers were unhappy and asking what we were offering as a replacement/alternative.

To ease the pain of some customers, I wrote a PowerCLI alternative for the defunct Storage Reports feature.  

It is also a good way to showcase PowerCLI capabilities because it is a very typical usage of PowerCLI : extracting the information we need from different objects and grouping these pieces of information into custom objects.

The resulting PowerCLI module, `Get-StorageViewsReport.psm1`, made its way to a public [knowledge base article](http://kb.vmware.com/kb/2112085) with examples and screenshots of its usage.  
So, all you need to know to use this module is in the KB article and in the module Help accessible via `Get-Help`.

It obtains storage capacity and utilization information by datastore, by VM or by ESXi host. It provides the same information as the Storage Views reports.

It requires PowerCLI 5.5 or later and Powershell 3.0 or later.

You can download the module from the [KB article](http://kb.vmware.com/kb/2112085), or [from GitHub](https://github.com/MathieuBuisson/Powershell-VMware/tree/master/Get-StorageViewsReport) to get the latest version. This version adds support for PowerCLI 6.0.
