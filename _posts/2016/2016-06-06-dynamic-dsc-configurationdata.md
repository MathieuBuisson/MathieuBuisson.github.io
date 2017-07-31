---
title: Adding ConfigurationData dynamically from a DSC configuration
ermalink: /adding-configurationdata-dynamically-from-a-dsc-configuration/
tags:
  - DSC
  - PowerShell
---

When writing a DSC configuration, separating the environmental data from the configuration logic is a best practice : it allows to reuse the same logic for different environments, for example the *Dev*, *QA* and *Prod* environments .  

This generally means that the environment data is stored in separate `.psd1` files. This is explained [in this documentation page](https://msdn.microsoft.com/en-us/powershell/dsc/configdata).

However, these configuration data files are relatively static, so if the environment changes frequently these files might end up containing outdated information. A solution is to keep the static environment data in the configuration data files and then **adding the dynamic data on the fly**.

A good example of this use case is a web application, where the configuration is identical for all web servers but these servers are treated not as *pets* but as *cattle* : we create and kill them on a daily basis.  

Because they are cattle, we don't call them by their name, in fact we don't even know their name. So the configuration data file doesn't contain any node names :

```powershell
@{
    # Node specific data
    AllNodes = @(
       # All the Web Servers have following information 
       @{
            NodeName           = '*'
            WebsiteName        = 'ClickFire'
            SourcePath         = '\\DevBox\SiteContents\'
            DestinationPath    = 'C:\inetpub\wwwroot\ClickFire_Content'
            DefaultWebSitePath = 'C:\inetpub\wwwroot\ClickFire_Content'
       }
    );
    NonNodeData = ''
}
```

By the way, the web application used in this example is an internal HR app, codenamed "**Project ClickFire**".

Let's assume the above configuration data is all the information we need to configure our nodes. That's great, but we still need some node names, otherwise there will be no MOF file generated when we run the configuration.  

So we'll need the query some kind of database to get the names of the web servers for this application, Active Directory for example. This is easy to do, especially if these servers are all in the same OU and/or there is a naming convention for them :

```powershell
C:\> $OUPath = 'OU=Project ClickFire,OU=Servers,DC=Mat,DC=lab'
C:\> $DynamicNodeNames = Get-ADComputer -SearchBase $OUPath -Filter {Name -Like 'Web*'} |
>> Select-Object -ExpandProperty Name
C:\> $DynamicNodeNames

Web083
Web084
Web086
```

Now that we have the node names, we need to add a hashtable for each node into the `AllNodes` section of our configuration data.  

To do that, we first need to import the data from the configuration data file and we store it into a variable for further manipulation. There is a new cmdlet introduced in PowerShell 5.0 which makes this very simple : `Import-PowerShellDataFile` :

```powershell
C:\> $EnvironmentData = Import-PowerShellDataFile -Path 'C:\Lab\EnvironmentData\Project_ClickFire.psd1'
C:\> $EnvironmentData

Name                           Value
----                           -----
AllNodes                       {System.Collections.Hashtable}
NonNodeData

C:\> $EnvironmentData.AllNodes

Name                           Value
----                           -----
DefaultWebSitePath             C:\inetpub\wwwroot\ClickFire_Content
NodeName                       *
WebsiteName                    ClickFire
DestinationPath                C:\inetpub\wwwroot\ClickFire_Content
SourcePath                     \\DevBox\SiteContents\  
```

Now, we have our configuration available to us as a `[hashtable]` and the `AllNodes` section inside of it is also a hashtable.  
More accurately, the `AllNodes` section is an array of hashtables because each node entry within `AllNodes` is a `[hashtable]` :

```powershell
C:\> $EnvironmentData.AllNodes.GetType()

IsPublic IsSerial Name                                     BaseType
-------- -------- ----                                     --------
True     True     Object[]                                 System.Array

C:\> $EnvironmentData.AllNodes | Get-Member | Select-Object TypeName -Unique

TypeName
--------
System.Collections.Hashtable  
```

So now, what we need to do is to inject a new node entry for each node returned by our Active Directory query into the `AllNodes` section : 

```powershell
C:\> Foreach ( $DynamicNodeName in $DynamicNodeNames ) {
     $EnvironmentData.AllNodes += @{NodeName = $DynamicNodeName; Role = 'WebServer'}
 }  
```

For each node name, we add a new `[hashtable]` into `AllNodes`.  
These hashtables are pretty simple in this case, this is just to give our nodes a name and a role (in case we need to differentiate with other server types, like database servers for example).

The result of this updated configuration data is equivalent to :

```powershell
@{
    # Node specific data
    AllNodes = @(
       # All the Web Servers have following information 
       @{
            NodeName           = '*'
            WebsiteName        = 'ClickFire'
            SourcePath         = '\\DevBox\SiteContents\'
            DestinationPath    = 'C:\inetpub\wwwroot\ClickFire_Content'
            DefaultWebSitePath = 'C:\inetpub\wwwroot\ClickFire_Content'
       }
       @{
            NodeName           = 'Web083'
            Role               = 'WebServer'
       }
       @{
            NodeName           = 'Web084'
            Role               = 'WebServer'
       }
       @{
            NodeName           = 'Web086'
            Role               = 'WebServer'
       }
    );
    NonNodeData = ''
}
```

So that's it for the node data, but what if we need to add non-node data ?  
It is very similar to the node data because the `NonNodeData` section of the configuration data is also a `[hashtable]`.

Let's say we want to add a piece of XML data that may be used for the `web.config` file of our web servers to the `NonNodeData` section of the configuration data. We could do that in the configuration data file :

```powershell
@{
    # Node specific data
    AllNodes = @(
       # All the Web Servers have following information 
       @{
            NodeName           = '*'
            WebsiteName        = 'ClickFire'
            SourcePath         = '\\DevBox\SiteContents\'
            DestinationPath    = 'C:\inetpub\wwwroot\ClickFire_Content'
            DefaultWebSitePath = 'C:\inetpub\wwwroot\ClickFire_Content'
       }
    );
    NonNodeData =
    @{
        DynamicConfig = [Xml](Get-Content -Path C:\Lab\SiteContents\web.config)
    }
}
```

Nope, we get an ugly error :  
`Cannot generate a Windows PowerShell object for a ScriptBlock evaluating dynamic expressions.`

This is because to safely import data from a file, the cmdlet `Import-PowerShellDataFile` works in **RestrictedLanguage** mode.  

This means that executing cmdlets, or functions, or any type of command is not allowed in a data file. Even the `[Xml]` type and a bunch of other things are not allowed in this mode. For more information, please refer to [about_Language_Modes](https://msdn.microsoft.com/powershell/reference/5.1/Microsoft.PowerShell.Core/about/about_Language_Modes).

It does make sense : **data files should contain data**, not code.

OK, so we'll do that from the DSC configuration script, then :

```powershell
C:\> $DynamicConfig = [Xml](Get-Content -Path '\\DevBox\SiteContents\web.config')
C:\> $DynamicConfig

xml                            configuration
---                            -------------
version='1.0' encoding='UTF-8' configuration

C:\> $EnvironmentData.NonNodeData = @{DynamicConfig = $DynamicConfig}
C:\> $EnvironmentData.NonNodeData.DynamicConfig.configuration

configSections      : configSections
managementOdata     : managementOdata
appSettings         : appSettings
system.web          : system.web
system.serviceModel : system.serviceModel
system.webServer    : system.webServer
runtime             : runtime  
```

With this technique, we can put whatever we want in `NonNodeData`, even XML data, as long as it is wrapped in a `[hashtable]`. The last command shows that we can easily access this dynamic config data because it is stored as a tidy `[Xml]` PowerShell object.

Please note that the Active Directory query, the import of the configuration data and the manipulation of this data are all done in the same script as the DSC configuration but **outside** of the DSC configuration itself.  
That way, this modified configuration data can be passed to the DSC config via its `ConfigurationData` parameter.

Putting it all together, here is what the whole DSC configuration script looks like :

```powershell
Configuration Project_ClickFire
{
    Import-DscResource -Module 'PSDesiredStateConfiguration'
    Import-DscResource -Module 'xWebAdministration'
    
    Node $AllNodes.Where{$_.Role -eq 'WebServer'}.NodeName
    {
        WindowsFeature IIS
        {
            Ensure          = 'Present'
            Name            = 'Web-Server'
        }
        File SiteContent
        {
            Ensure          = 'Present'
            SourcePath      = $Node.SourcePath
            DestinationPath = $Node.DestinationPath
            Recurse         = $True
            Type            = 'Directory'
            DependsOn       = '[WindowsFeature]IIS'
        }        
        xWebsite Project_ClickFire_WebSite
        {
            Ensure          = 'Present'
            Name            = $Node.WebsiteName
            State           = 'Started'
            PhysicalPath    = $Node.DestinationPath
            DependsOn       = '[File]SiteContent'
        }
    }
}
# Adding dynamic Node data
$EnvironmentData = Import-PowerShellDataFile -Path "$PSScriptRoot\..\EnvironmentData\Project_ClickFire.psd1"
$OUPath = 'OU=Project ClickFire,OU=Servers,DC=Mat,DC=lab'
$DynamicNodeNames = (Get-ADComputer -SearchBase $OUPath -Filter {Name -Like 'Web*'}).Name

Foreach ( $DynamicNodeName in $DynamicNodeNames ) {
    $EnvironmentData.AllNodes += @{NodeName = $DynamicNodeName; Role = 'WebServer'}
}
# Adding dynamic non-Node data
$DynamicConfig = [Xml](Get-Content -Path '\\DevBox\SiteContents\web.config')
$EnvironmentData.NonNodeData = @{DynamicConfig = $DynamicConfig}

Project_ClickFire -ConfigurationData $EnvironmentData -OutputPath 'C:\Lab\Conf\Project_ClickFire'  
```

Running this script indeed generates a MOF file for each node, containing the same settings :

```powershell
C:\> & 'C:\Lab\Conf\Project_ClickFire_Config.ps1'

    Directory: C:\Lab\Conf\Project_ClickFire

Mode                LastWriteTime         Length Name                                       
----                -------------         ------ ----                                       
-a----         6/6/2016   1:37 PM           3986 Web083.mof                                 
-a----         6/6/2016   1:37 PM           3986 Web084.mof                                 
-a----         6/6/2016   1:37 PM           3986 Web086.mof  
```

Hopefully, this helps treating web servers really as **cattle** and give its full meaning to the expression "server **farm**".