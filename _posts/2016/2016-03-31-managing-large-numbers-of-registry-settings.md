---
title: Managing large numbers of registry settings with PowerShell DSC
tags: [DSC, PowerShell]
---

Recently, I had to manage the configuration of the remote control settings of client machines with PowerShell DSC. These settings are located in the registry key `HKLM:\SYSTEM\CurrentControlSet\Services\HidIr\Remotes` :

![Remotes registry key]({{ site.url }}/images/2016-03-31-managing-large-numbers-of-registry-settings.png)

Yes, this is 19 registry values for every single remote control model.  
Here is what a resource entry in a DSC configuration would look like, using the built-in `Registry` resource :

```powershell
Registry IRRemotes
{
        Ensure = 'Present'
        Key = 'HKLM:\SYSTEM\CurrentControlSet\Services\HidIr\Remotes\745a17a0-74d3-11d0-b6fe-00a0c90f57da'
        ValueName = 'CodeMatchMask'
        ValueData = '4294905600'
        ValueType = 'Dword'
}
```

This is for a single registry value.  
So, we take this, we multiply it by 19 values and we multiply it by 6 remote control models and the result is : **684 lines of code**.  
This is going to be a pain to write and a nightmare to maintain.

So, when the line count of a DSC configuration jumps like this, we should take a step back and ask ourselves questions like :  
  - What is the impact on the readability and the maintainability of the DSC configuration ?  
  - If we use DSC configurations as *Documentation-as-Code*, do we need these details ?  
  - Is the business value enabled by this code greater than the cost write and maintain it ?  
  - Is there another way to achieve the same result ?  

In this case the conclusion :  

> There has to be a better way  

I couldn't find any, so I wrote a custom DSC resource which is better suited at handling large numbers of registry settings (especially registry keys with many subkeys and values). This DSC resource is `cRegFile`.

## How does it work ?

Basically, it uses :  
  - .reg files to contain all the settings in a managed registry key  
  - `reg.exe` to import and export .reg files  
  - `Get-FileHash` to compare the contents of .reg files  

For the nitty-gritty, you can have a look at the code. As usual, the module is [on GitHub](https://github.com/MathieuBuisson/Powershell-Administration/tree/master/cRegFile).

The .reg file specified represents **the desired state** for a registry key.
So, it contains the managed registry key, **with all its subkeys and values** recursively.

This reference .reg file first needs to be generated. To do that, we get a reference machine, make sure its registry key has all the settings we want.  

Then we export the registry key, from `regedit`, or with a `reg.exe export` command. Either way, the content and the format of the .reg file are the same.

The `cRegFile` resource is pretty simple to use, as we can see looking at its syntax :

```powershell
C:\> Get-DscResource -Name 'cRegFile' -Syntax

cRegFile [String] #ResourceName
{
     Key = [string]
    [DependsOn = [string[]]]
    [PsDscRunAsCredential = [PSCredential]]
    [RegFilePath = [string]]
}
```

Now, going back to our remote control settings, let's configure all the registry values for all the remote control models that we want to support.
To do that, we add the following to our DSC configuration :

```powershell
        File RemotesRegFile
        {
            DestinationPath = $($Node.RegFileFolder) + 'RemotesKey.reg'
            SourcePath = '\\DevBox\Share\RemotesKey.reg'
            Ensure = 'Present'
            Type = 'File'
            Credential = $Credential
            Checksum = 'SHA-1'
            Force = $true
            MatchSource = $true
        }
        cRegFile SupportedRemoteControls
        {
            key = 'HKLM:\SYSTEM\CurrentControlSet\Services\HidIr\Remotes'
            RegFilePath = $($Node.RegFileFolder) + 'RemotesKey.reg'
            DependsOn = '[File]RemotesRegFile'
        }
```
&nbsp;
In case you are wondering what is `$Node.RegFileFolder`, this is a way to not hard-code the path in the configuration and get its value from the configuration data.

Also, notice the file resource entry. This is because the `reg.exe import` command doesn't support remote files, so we first need to copy the .reg file to the target node, to be able to use it with the `cRegFile` resource.

Because something needs to happen in the `File` resource **before** what needs to happen in the `cRegFile` resource, we add a `DependsOn` property to our `cRegFile` resource entry to set the order in which things can happen.

As we can see, this is much cleaner than 684 lines.  
So, whenever there are more than a few registry values to manage within the same key, this resource makes the DSC configurations much shorter than with the built-in `Registry` resource. And it runs faster.

OK, the old-school `reg.exe` is not pure PowerShell, but the PowerShell story regarding the registry is not ideal (still using PSDrives, seriously ?). `reg.exe` is fast, easy to use, battle-tested reliable.  
More interestingly, it is surprisingly close to the philosophy of DSC : the desired state is defined in a *declarative* text file and the "Make it so" command : `reg.exe import ` is idempotent.

I encourage you to [grab it here](https://github.com/MathieuBuisson/Powershell-Administration/tree/master/cRegFile) and give it a try.

**UPDATE :** the module is now available in the [PowerShell Gallery](https://www.powershellgallery.com/packages/cRegFile/), so it can be installed right from a PowerShell console with `Install-Module`.
