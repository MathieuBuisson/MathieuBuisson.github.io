---
title: Rebooting a server remotely
tags: [PowerShell]
---

> "Have you tried turning it off and on again?"

This quote from <a href="http://www.imdb.com/title/tt0487831/">IT Crowd</a> reflects probably the most universal stereotype about IT support. By the way, using this shortcut instead of actually diagnosing the problem shouldn't be the usual course of action. But still, a reboot can really save you when you are in firefighting mode.  

What if you need to reboot a machine which is remote or in a locked server room ?  
Here are a few commands to do that remotely:

## shutdown.exe

The good old **shutdown.exe** is a command line executable, it can be called from a cmd.exe command prompt or from a PowerShell console.
To reboot a remote machine called MySickServer, run the command :  
`shutdown -r -m \\MySickServer`

You can also schedule the reboot for later. For example, the reboot MySickServer one hour from now, you can run :  
`shutdown -r -t 3600 -m \\MySickServer`

Another nice usage of the shutdown command is :  
`shutdown -i`

It exposes pretty much all the options of the shutdown command in a nice little UI, which looks like this :  
![Shutdown]({{ site.url }}/images/2015-09-27-rebooting-server-remotely-shutdown.png)

## Restart-Computer

Conveniently, PowerShell 3.0 introduced a cmdlet for this exact purpose : Restart-Computer.

There is a limitation to keep in mind, though : this cmdlet will fail if a user is currently logged into the remote server.
In this case, if you are willing to kick any user out and force any application to close, may the `-Force` be with you :

```powershell
Restart-Computer -ComputerName 'MySickServer' -Force
```

At the other end of the safety spectrum, there is the `-WhatIf` parameter. It tells you what `Restart-Computer` would do to which computer(s), without actually doing it.

```powershell
Restart-Computer -ComputerName 'MySickServer' -Whatif
```

## The WMI way

If your computer is still using PowerShell 2.0, then you can rely on the good ol’ <abbr title="Windows Management Instrumentation">WMI</abbr>. The <abbr title="Windows Management Instrumentation">WMI</abbr> class **Win32_OperatingSystem** have the methods `Shutdown`, `Win32Shutdown` and `Reboot`. We are just going to look at the `Reboot` method for our purpose here but you can refer to <a href="https://msdn.microsoft.com/en-us/library/gg196658(v=vs.85).aspx">this documentation</a> for the other methods.

We get a <abbr title="Windows Management Instrumentation">WMI</abbr> object for our remote server and store it into a variable. Notice that we can pass specific credentials for this remote server. The `-Credential` parameter can take an existing PSCredential object or we can use `Get-Credential` to get a prompt where we can enter a username and password.

```powershell
$OS = Get-WmiObject Win32_OperatingSystem -ComputerName 'MySickServer' -Credential (Get-Credential)
$OS.Reboot()
```

When we have the desired <abbr title="Windows Management Instrumentation">WMI</abbr> object stored into our variable, we call the `Reboot` method on it using the dot notation.

## Restart-PcsvDevice

This is a new cmdlet available in Windows 8.1, 2012 R2, and later, and it comes from the **PcsvDevice** PowerShell module. PCSV stands for Physical Computer System View, if you were curious.

For its remoting protocol, it uses <abbr title="Web Services-Management">WS-MAN</abbr> or <abbr title="Intelligent Platform Management Interface">IPMI</abbr>, both of which are industry standards, meaning not proprietary, which is good for interoperability.  
The cmdlets in the **PcsvDevice** module are for out-of-band management, this means that they don't even require an OS to be up and responding on the target server, they just require a Baseboard Management Controller (BMC).

```powershell
$Cred = Get-Credential
Restart-PcsvDevice -TargetAddress 192.168.56.21 -ManagementProtocol IPMI -Credential $Cred
```

Note that we have to specify the remoting protocol (<abbr title="Web Services-Management">WS-MAN</abbr> or in this case <abbr title="Intelligent Platform Management Interface">IPMI</abbr>) using the `-ManagementProtocol` parameter because it is a mandatory parameter.  

We can also set up a CIM session and then, use this session to connect to the remote server, like so :

```powershell
$Session = New-CimSession -ComputerName 192.168.56.21 -Credential (Get-Credential)
Restart-PcsvDevice -CimSession $Session
```

And this is just one cmdlet from the **PcsvDevice** module, <a href="https://technet.microsoft.com/en-us/library/dn283380.aspx">there are others...</a>
