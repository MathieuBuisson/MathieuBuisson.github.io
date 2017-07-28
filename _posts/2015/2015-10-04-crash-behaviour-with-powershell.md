---
title: Configure Windows crash behaviour with PowerShell
tags:
  - PowerShell
  - Windows
---

When there is a OS-handled crash (a blue screen), there are some settings in the **Startup and Recovery** Control Panel, which tells Windows how it should behave. For example, whether it restarts automatically or not, whether it writes a small, a kernel dump or a full memory dump, and where :  


![Shutdown]({{ site.url }}/images/2015-10-04-crash-behaviour-with-powershell-recovery.png)

If you want to troubleshoot a recurrent crash, you may want to alter these settings.  

For example, you may need to set the system **not** to restart automatically to be able to see the blue screen. You may also need a complete memory dump to facilitate your investigations or to send to Microsoft Support.

Here is how to do this using PowerShell :

These settings correspond to properties of the <abbr title="Windows Management Instrumentation">WMI</abbr> class : `Win32_OSRecoveryConfiguration`, so let’s start by checking what we have in there :

```powershell
C:\> $CrashBehaviour = Get-WmiObject Win32_OSRecoveryConfiguration -EnableAllPrivileges
C:\> $CrashBehaviour | Format-List *


PSComputerName             : DevBox
__GENUS                    : 2
__CLASS                    : Win32_OSRecoveryConfiguration
__SUPERCLASS               : CIM_Setting
__DYNASTY                  : CIM_Setting
__RELPATH                  : Win32_OSRecoveryConfiguration.Name="Microsoft Windows 10
                             Pro|C:\\WINDOWS|\\Device\\Harddisk0\\Partition3"
__PROPERTY_COUNT           : 15
__DERIVATION               : {CIM_Setting}
__SERVER                   : DevBox
__NAMESPACE                : root\cimv2
__PATH                     : \\DevBox\root\cimv2:Win32_OSRecoveryConfiguration.Name="Microsoft
                             Windows 10 Pro|C:\\WINDOWS|\\Device\\Harddisk0\\Partition3"
AutoReboot                 : True
Caption                    :
DebugFilePath              : %SystemRoot%\MEMORY.DMP
DebugInfoType              : 7
Description                :
ExpandedDebugFilePath      : C:\WINDOWS\MEMORY.DMP
ExpandedMiniDumpDirectory  : C:\WINDOWS\Minidump
KernelDumpOnly             : False
MiniDumpDirectory          : %SystemRoot%\Minidump
Name                       : Microsoft Windows 10 Pro|C:\WINDOWS|\Device\Harddisk0\Partition3
OverwriteExistingDebugFile : True
SendAdminAlert             : False
SettingID                  :
WriteDebugInfo             : True
WriteToSystemLog           : True
Scope                      : System.Management.ManagementScope
Path                       : \\DevBox\root\cimv2:Win32_OSRecoveryConfiguration.Name="Microsoft
                             Windows 10 Pro|C:\\WINDOWS|\\Device\\Harddisk0\\Partition3"
Options                    : System.Management.ObjectGetOptions
ClassPath                  : \\DevBox\root\cimv2:Win32_OSRecoveryConfiguration
Properties                 : {AutoReboot, Caption, DebugFilePath, DebugInfoType...}
SystemProperties           : {__GENUS, __CLASS, __SUPERCLASS, __DYNASTY...}
Qualifiers                 : {dynamic, Locale, provider, UUID}
```

The parameter `EnableAllPrivileges` allows us to manipulate the properties of this <abbr title="Windows Management Instrumentation">WMI</abbr> object if the current Powershell host runs as Administrator.

Here is how to prevent Windows to restart automatically after a system failure :

```powershell
C:\> $CrashBehaviour | Set-WmiInstance -Arguments @{ AutoReboot=$False }

DebugFilePath           Name                                                             SettingID
-------------           ----                                                             ---------
%SystemRoot%\MEMORY.DMP Microsoft Windows 10 Pro|C:\WINDOWS|\Device\Harddisk0\Partition3
```

Now, we are going to configure the type of memory dump: small, kernel, or complete.  
Here are the possible values and their meaning :  
  - 0 = None  
  - 1 = Complete memory dump  
  - 2 = Kernel memory dump  
  - 3 = Small memory dump  

Here is how to configure Windows to save full dumps.  
I had some difficulties to make it work using the variable `$CrashBehaviour`, so here is how to do it :

```powershell
C:\> Get-WmiObject -Class Win32_OSRecoveryConfiguration -EnableAllPrivileges |
>> Set-WmiInstance -Arguments @{ DebugInfoType=1 }

DebugFilePath           Name                                                             SettingID
-------------           ----                                                             ---------
%SystemRoot%\MEMORY.DMP Microsoft Windows 10 Pro|C:\WINDOWS|\Device\Harddisk0\Partition3
```

And how to verify our change :

```powershell
C:\> (Get-WmiObject -Class Win32_OSRecoveryConfiguration).DebugInfoType
1
```

If you have recurrent crashes and you want to check if it is the same type of failure every time, you may want to keep any existing memory dump when writing a new dump to disk.

This may consume a large amount of disk space, especially with full dumps !
{: .notice--danger }

```powershell
C:\> $CrashBehaviour | Set-WmiInstance -Arguments @{ OverwriteExistingDebugFile=$False }

DebugFilePath           Name                                                             SettingID
-------------           ----                                                             ---------
%SystemRoot%\MEMORY.DMP Microsoft Windows 10 Pro|C:\WINDOWS|\Device\Harddisk0\Partition3
```

Now, if you want to change where the dump files are written (perhaps on a volume with more free space), here is how to change the location of the memory dumps :

```powershell
C:\> $CrashBehaviour | Set-WmiInstance -Arguments @{ DebugFilePath='E:\MEMORY.DMP' }
```

And how to verify the configuration :

```powershell
C:\> $CrashBehaviour | Select-Object 'DebugFilePath', 'ExpandedDebugFilePath'

DebugFilePath           ExpandedDebugFilePath
-------------           ---------------------
E:\MEMORY.DMP           E:\MEMORY.DMP
```

By default, an OS-handled crash will write an event in the System event log.  
I'm not sure why you would want to change this behaviour, but in case you do, here is how to accomplish this it :

```powershell
C:\> $CrashBehaviour | Set-WmiInstance -Arguments @{ WriteToSystemLog=$False }
```

Keep in mind that these settings may require a reboot to take effect.
{: .notice--warning }
