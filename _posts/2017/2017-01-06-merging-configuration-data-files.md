---
title: Merging data from 2 PowerShell DSC configuration data files
tags: [DSC, Powershell]
---

As you probably already know, when writing a DSC configuration, [separating the environmental data from the configuration logic](https://msdn.microsoft.com/en-us/powershell/dsc/configdata) is a best practice. So all the environment-specific data gets stored in separate (typically `.psd1`) files.  
If you work with PowerShell DSC at medium-to-large scale, you (hopefully) have separate configuration data files for each customer and each environment.  

Something like this, for example :

```powershell
C:\TEST                                                    
│   Common_ConfigDataServer.psd1                           
│                                                          
├───Customer A                                             
│   ├───Production                                         
│   │       ConfigDataServer.psd1                          
│   │                                                      
│   ├───Staging                                            
│   │       ConfigDataServer.psd1                          
│   │                                                      
│   └───Test                                               
│           ConfigDataServer.psd1                          
│                                                          
├───Customer B                                             
│   ├───Production                                         
│   │       ConfigDataServer.psd1                          
│   │                                                      
│   ├───Staging                                            
│   │       ConfigDataServer.psd1                          
│   │                                                      
│   └───Test                                               
│           ConfigDataServer.psd1                          
│                                                          
└───Customer C                                             
    ├───Production                                         
    │       ConfigDataServer.psd1                          
    │                                                      
    ├───Staging                                            
    │       ConfigDataServer.psd1                          
    │                                                      
    └───Test                                               
            ConfigDataServer.psd1   
```

Now, imagine we add stuff to a DSC configuration which takes some values from additional settings in the configuration data files. Updating every configuration data files every time would get very inefficient as the number of customers or environments grows.  

A solution for that is to have a common configuration data file which contains the common settings and their default values (`Common_ConfigDataServer.psd1` in the example above).  
Then, we have a config data file for each environment, which contains only the data that is specific to a given customer or environment.  

Finally, we merge the configuration data from the 2 files (the common one and the environment-specific one) before passing this to the `ConfigurationData` parameter of the DSC configuration.  
In this scenario, we need to ensure that the more specific data takes precedence over the common data. This means :  

  - Data which is present in the environment-specific file and absent from the common file gets added  
  - Data which is absent in the environment-specific file and present in the common file is preserved  
  - Data which is present in both files gets the value from the environment-specific file  

Let's look at how to do this.  
In the example we are going to work with, the content of the common configuration data file (`Common_ConfigDataServer.psd1`) is :  

```powershell
@{ 
    # Node specific data 
    AllNodes = @(
       @{ 
            NodeName = '*'
            PSDscAllowPlainTextPassword = $True
            ServicesEndpoint = 'http://localhost/Services/'
            TimeZone = 'Pacific Standard Time'
       }
    );
}   
```

And we are going to merge/override it with the file for Customer A's Test environment, which contains this :  

```powershell
@{ 
    # Node specific data 
    AllNodes = @( 
       @{ 
            NodeName = '*'
            TimeZone = 'GMT Standard Time'
            LocalAdministrators = 'MyLocalUser'
       },
       @{
            NodeName = 'Server1'
            Role = 'Primary'
       },
       @{
            NodeName = 'Server2'
            Role = 'Secondary'
       }
    );
}   
```

As we can see, the environment-specific data contains :  
  - Additional node entries : Server1 and server2  
  - An additional setting in an existing node : "LocalAdministrators" in the "*" node entry  
  - A different value for an existing setting in an existing node : TimeZone in the "*" node entry  


To take care of the merging, we are going to use a function I wrote, named `Merge-DscConfigData`. The module containing this function is available [here](https://github.com/MathieuBuisson/PowerShell-DevOps/tree/master/Merge-DscConfigData) and [on the PowerShell Gallery](https://www.powershellgallery.com/packages/Merge-DscConfigData/).  

{% capture notice-text %}
This function uses `Invoke-Expression` to convert the content of the configuration data files into PowerShell objects. This is to keep this function compatible with PowerShell 4.0, but be aware that using `Invoke-Expression` has [security implications](https://blogs.msdn.microsoft.com/powershell/2011/06/03/invoke-expression-considered-harmful/).  
If you can get away with being compatible only with PowerShell 5.0 and later, then you should use `Import-PowerShellDataFile` instead.{% endcapture %}

<div class="notice--warning">
  <h4>Warning :</h4>
  {{ notice-text | markdownify }}
</div>

This function takes the path of the common configuration data file via its `BaseConfigFilePath `parameter and the environment-specific data file via its `OverrideConfigFilePath` parameter. It outputs the merged data as a `hashtable` that can be directly consumed by a DSC configuration.  

Here is what it looks like :  

<a href="http://theshellnut.com/wp-content/uploads/2017/01/Merge-DscConfigData.png"><img src="http://theshellnut.com/wp-content/uploads/2017/01/Merge-DscConfigData.png" alt="" width="785" height="793" class="alignnone size-full wp-image-1043" /></a>

The function's verbose output gives a pretty good idea of how it works.
Also, we can see that the output object is a hashtable. More accurately, it is a hashtable containing an array of nested hashtables (one per node entry). This is exactly what the `ConfigurationData` parameter of any DSC configuration expects.

Now, let's verify we can use this output object in a DSC configuration and that running the configuration results in the expected MOF files.
For testing purposes, we are going to use the following DSC configuration :

```powershell
Configuration ProvisionServers
{

    Import-DscResource -ModuleName PSDesiredStateConfiguration
    Import-DscResource -ModuleName xTimeZone

     Node $AllNodes.NodeName
     {
        Registry ServicesEndpoint
        {
            Key = 'HKLM:\SOFTWARE\MyApp\Server\Config'
            ValueName = 'ServicesEndpoint'
            ValueData = $Node.ServicesEndpoint
            ValueType = 'String'
            Ensure = 'Present'
        }
        xTimeZone TimeZone
        {
            IsSingleInstance = 'Yes'
            TimeZone = $Node.TimeZone
        }
        If ( $Node.LocalAdministrators ) {
            Group LocalAdminUsers
            {
                GroupName = 'Administrators'
                MembersToInclude = $Node.LocalAdministrators
                Ensure = 'Present'
            }
        }
     }

    Node $AllNodes.Where{$_.Role -eq 'Primary'}.NodeName
    {
        File FolderForPrimaryServer
        {
            DestinationPath = 'C:\MyApp_Data'
            Ensure = 'Present'
            Type = 'Directory'
        }
    }
}
   
```

Then, we just invoke our configuration named `ProvisionServers`, passing our merged data to its `ConfigurationData` parameter, like so :

<a href="http://theshellnut.com/wp-content/uploads/2017/01/Invoking-the-DSC-configuration.png"><img src="http://theshellnut.com/wp-content/uploads/2017/01/Invoking-the-DSC-configuration.png" alt="" width="785" height="261" class="alignnone size-full wp-image-1045" /></a>

Now, let's check the configuration documents which have been generated from this DSC configuration and data. Here is the content of Server1.mof :

```powershell
/*
@TargetNode='Server1'
@GeneratedBy=mbuisson
@GenerationDate=01/06/2017 13:52:43
*/

instance of MSFT_RegistryResource as $MSFT_RegistryResource1ref
{
ResourceID = "[Registry]ServicesEndpoint";
 ValueName = "ServicesEndpoint";
 Key = "HKLM:\\SOFTWARE\\MyApp\\Server\\Config";
 Ensure = "Present";
 SourceInfo = "::9::9::Registry";
 ValueType = "String";
 ModuleName = "PSDesiredStateConfiguration";
 ValueData = {
    "http://localhost/Services/"
};

ModuleVersion = "1.0";

 ConfigurationName = "ProvisionServers";

};
instance of xTimeZone as $xTimeZone1ref
{
ResourceID = "[xTimeZone]TimeZone";
 SourceInfo = "::17::9::xTimeZone";
 TimeZone = "GMT Standard Time";
 IsSingleInstance = "Yes";
 ModuleName = "xTimeZone";
 ModuleVersion = "1.3.0.0";

 ConfigurationName = "ProvisionServers";

};
instance of MSFT_GroupResource as $MSFT_GroupResource1ref
{
ResourceID = "[Group]LocalAdminUsers";
 MembersToInclude = {
    "MyLocalUser"
};
 Ensure = "Present";
 SourceInfo = "::23::13::Group";
 GroupName = "Administrators";
 ModuleName = "PSDesiredStateConfiguration";

ModuleVersion = "1.0";

 ConfigurationName = "ProvisionServers";

};
instance of MSFT_FileDirectoryConfiguration as $MSFT_FileDirectoryConfiguration1ref
{
ResourceID = "[File]FolderForPrimaryServer";
 Type = "Directory";
 Ensure = "Present";
 DestinationPath = "C:\\MyApp_Data";
 ModuleName = "PSDesiredStateConfiguration";
 SourceInfo = "::34::9::File";

ModuleVersion = "1.0";

 ConfigurationName = "ProvisionServers";

};
instance of OMI_ConfigurationDocument


                    {
                        Version="2.0.0";
                        MinimumCompatibleVersion = "1.0.0";
                        CompatibleVersionAdditionalProperties= {"Omi_BaseResource:ConfigurationName"};
                        Author="mbuisson";
                        GenerationDate="01/06/2017 13:52:43";
                        Name="ProvisionServers";
                    };
   
```

First, the sole fact that we got a file named Server1.mof tells us one thing : the node entry with the NodeName "Server1" was indeed in the merged config data.

Also, we can see that the value of the setting `ServicesEndpoint `from the common data file was preserved and properly injected in the `Registry `resource entry of the DSC configuration.

Then, we see that the time zone value is "GMT Standard Time", so this was overridden by the environment-specific data, as expected. The setting "LocalAdministrators" was not present in the common data file but it got added and its value is properly reflected in the `Group` resource entry.

Finally, the resource entry named "FolderForPrimaryServer" was processed, which means the "Role" settings had the value "Primary". This is the expected value for Server1.

Now, we can verify the configuration document which has been generated for Server2 :

```powershell
/*
@TargetNode='Server2'
@GeneratedBy=mbuisson
@GenerationDate=01/06/2017 13:52:43
*/

instance of MSFT_RegistryResource as $MSFT_RegistryResource1ref
{
ResourceID = "[Registry]ServicesEndpoint";
 ValueName = "ServicesEndpoint";
 Key = "HKLM:\\SOFTWARE\\MyApp\\Server\\Config";
 Ensure = "Present";
 SourceInfo = "::9::9::Registry";
 ValueType = "String";
 ModuleName = "PSDesiredStateConfiguration";
 ValueData = {
    "http://localhost/Services/"
};

ModuleVersion = "1.0";

 ConfigurationName = "ProvisionServers";

};
instance of xTimeZone as $xTimeZone1ref
{
ResourceID = "[xTimeZone]TimeZone";
 SourceInfo = "::17::9::xTimeZone";
 TimeZone = "GMT Standard Time";
 IsSingleInstance = "Yes";
 ModuleName = "xTimeZone";
 ModuleVersion = "1.3.0.0";

 ConfigurationName = "ProvisionServers";

};
instance of MSFT_GroupResource as $MSFT_GroupResource1ref
{
ResourceID = "[Group]LocalAdminUsers";
 MembersToInclude = {
    "MyLocalUser"
};
 Ensure = "Present";
 SourceInfo = "::23::13::Group";
 GroupName = "Administrators";
 ModuleName = "PSDesiredStateConfiguration";

ModuleVersion = "1.0";

 ConfigurationName = "ProvisionServers";

};
instance of OMI_ConfigurationDocument


                    {
                        Version="2.0.0";
                        MinimumCompatibleVersion = "1.0.0";
                        CompatibleVersionAdditionalProperties= {"Omi_BaseResource:ConfigurationName"};
                        Author="mbuisson";
                        GenerationDate="01/06/2017 13:52:43";                        
                        Name="ProvisionServers";
                    };
   
```

The value of the setting `ServicesEndpoint `from the common data file was preserved as well. The time zone value is "GMT Standard Time", so this was overridden as well. The setting "LocalAdministrators" got added as well because it applied to all nodes in the environment-specific data file.

More interestingly, unlike the MOF file for Server1, the one for Server2 doesn't have the resource entry named "FolderForPrimaryServer". This tells us that in the merged configuration data, the `Role `value for Server2 was not "Primary". This is expected because the value for this setting was "Secondary" in the environment-specific data file.

That's all there is to using the `Merge-DscConfigData` function.

I am aware that some configuration management tools can make overriding configuration data easier, for example, attributes defined at a Chef cookbook level can be overridden at different levels. But for those of us using PowerShell DSC in production, this is a working alternative.
