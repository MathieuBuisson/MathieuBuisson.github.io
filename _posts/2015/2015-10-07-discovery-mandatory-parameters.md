---
title: Automate the discovery of mandatory parameters
tags: [PowerShell]
---

Sometimes, when trying out a cmdlet I rarely use, I get that :

![Prompt]({{ site.url }}/images/2015-10-07-discovery-mandatory-parameters-prompt.png)  
This means I forgot to enter a parameter which is mandatory for this cmdlet. PowerShell is very forgiving and asks me nicely to enter a value for this parameter.

You see, learning PowerShell is not about rote knowledge of every single cmdlets. We, IT pros, have other things to do with our time than memorizing thousands of cmdlets and parameters.  

Thankfully, PowerShell has been designed to be **highly discoverable**. There are plenty of tools built-in to PowerShell which allows to discover cmdlets and their parameters.

Let’s explore some these tools and see how we can automate the discovery of mandatory parameters.

```powershell
C:\> $CmdString = 'Register-ScheduledJob'
C:\> (Get-Command $CmdString).Parameters

Key                  Value
---                  -----
FilePath             System.Management.Automation.ParameterMetadata
ScriptBlock          System.Management.Automation.ParameterMetadata
Name                 System.Management.Automation.ParameterMetadata
Trigger              System.Management.Automation.ParameterMetadata
InitializationScript System.Management.Automation.ParameterMetadata
RunAs32              System.Management.Automation.ParameterMetadata
Credential           System.Management.Automation.ParameterMetadata
Authentication       System.Management.Automation.ParameterMetadata
ScheduledJobOption   System.Management.Automation.ParameterMetadata
ArgumentList         System.Management.Automation.ParameterMetadata
MaxResultCount       System.Management.Automation.ParameterMetadata
RunNow               System.Management.Automation.ParameterMetadata
RunEvery             System.Management.Automation.ParameterMetadata
Verbose              System.Management.Automation.ParameterMetadata
Debug                System.Management.Automation.ParameterMetadata
ErrorAction          System.Management.Automation.ParameterMetadata
WarningAction        System.Management.Automation.ParameterMetadata
InformationAction    System.Management.Automation.ParameterMetadata
ErrorVariable        System.Management.Automation.ParameterMetadata
WarningVariable      System.Management.Automation.ParameterMetadata
WhatIf               System.Management.Automation.ParameterMetadata
Confirm              System.Management.Automation.ParameterMetadata
```

That was easy.  

But hold on, what I want is only the <em>mandatory</em> parameters.  
Also, I want everything I need to know to test a parameter and how it may work (or not) with other parameters :  
  - Its parameter set  
  - The data type it accepts  
  - Its position if it is positional  
  - Whether it accepts pipeline input  
  - Whether it accepts wildcards  

## Discovering parameter sets  

If you don't know what parameter sets are, essentially, they are a way to exclude 2 parameters of a cmdlet from each other to make sure that these 2 parameters won't be used in the same command.

```powershell
C:\> $CmdData = Get-Command $CmdString
C:\> $CmdData.ParameterSets.Name
ScriptBlock
FilePath
```

Here, we see that the cmdlet `Register-ScheduledJob` has 2 parameter sets : `ScriptBlock` and `FilePath`.  
Parameter(s) which are in one parameter set but not in any other set are what I call <em>exclusive parameters</em>. Exclusive parameters cannot be used in the same command as any other exclusive parameter from another set.

Here is how to identify these <em>exclusive parameters</em> parameters :

```powershell
C:\> $ScriptBlockParams = $CmdData.ParameterSets[0].Parameters.Name
C:\> $FilePathParams = $CmdData.ParameterSets[1].Parameters.Name
C:\> Compare-Object $ScriptBlockParams $FilePathParams

InputObject SideIndicator
----------- -------------
FilePath    =>
ScriptBlock <=
```

Aha.  
The name of the parameter sets correspond to the exclusive parameter in that set. Many cmdlets parameter sets are designed that way.  
So, if we use the `FilePath` parameter, this puts the cmdlet `Register-ScheduledJob` in the `FilePath` mode, which prevents us from using the `ScriptBlock` parameter. And vice versa.

## Getting mandatory parameters  

```powershell
C:\> $CmdData.ParameterSets |
>> ForEach-Object {$_.Parameters | Where-Object { $_.IsMandatory }} |
>> Select-Object -ExpandProperty Name
ScriptBlock
Name
FilePath
Name
```

The `Name` parameter is displayed twice. This is because it is mandatory in both parameter sets.  
We don't want duplicate parameters, so let's do it another way.

The nested property called "Attributes" have some juicy bits for us :

```powershell
C:\> ($CmdData.Parameters.Values | Select-Object -First 1).Attributes

Position                        : 1
ParameterSetName                : FilePath
Mandatory                       : True
ValueFromPipeline               : False
ValueFromPipelineByPropertyName : False
ValueFromRemainingArguments     : False
HelpMessage                     :
HelpMessageBaseName             :
HelpMessageResourceId           :
DontShow                        : False
TypeId                          : System.Management.Automation.ParameterAttribute

TypeId : System.Management.Automation.ValidateNotNullOrEmptyAttribute
```

So here is how we filter only mandatory parameters :

```powershell
C:\> $MandatoryParameters = $CmdData.Parameters.Values |
>> Where-Object { $_.Attributes.Mandatory }
```

## Building a custom object containing the parameter information  

Getting the parameter position, accepted data type, and parameter set is pretty simple because these are properties of our current objects, or of the nested `Attributes` property.  

Let's build a custom object from that :

```powershell
Foreach ( $MandatoryParameter in $MandatoryParameters ) {

    $Props = [ordered]@{
        Name = $MandatoryParameter.Name
        'Parameter Set'= $MandatoryParameter.Attributes.ParameterSetName
        Position = $MandatoryParameter.Attributes.Position
        'Data Type' = $MandatoryParameter.ParameterType
    }
    $Obj = New-Object -TypeName psobject -Property $Props
    $Obj
}
```

Now, there are 2 more properties we want to add to our parameter object :  
  - Whether it accepts pipeline input  
  - Whether it accepts wildcards  

To this end, we are going to use another invaluable discoverability tool : `Get-Help`.

```powershell
C:\> Get-Help $CmdString -Parameter $MandatoryParameters[0].Name

-FilePath <String>
    Specifies a script that the scheduled job runs. Enter the path to a .ps1 file on the 
    local computer. To specify default values for the script parameters, use the ArgumentList 
    parameter. Every Register-ScheduledJob command must use either the ScriptBlock or 
    FilePath parameters.
    
    Required?                    true
    Position?                    2
    Default value                None
    Accept pipeline input?       false
    Accept wildcard characters?  false
```

It seems we have what we need here, but wait.  
Is the property regarding pipeline input really named "Accept pipeline input?" ?  
Is the property regarding the wildcard characters really named "Accept wildcard characters?" ?

No, this is the result of the default formatting view for `MamlCommandHelpInfo#parameter` type.  
We need to override the default formatting to get the actual property names :

```powershell
C:\> Get-Help $CmdString -Parameter $MandatoryParameters[0].Name |
>> Format-List


description    : {@{Text=Specifies a script that the scheduled job runs.
                 Enter the path to a .ps1 file on the local computer. To
                 specify default values for the script parameters, use the
                 ArgumentList parameter. Every Register-ScheduledJob
                 command must use either the ScriptBlock or FilePath
                 parameters.}}
defaultValue   : None
parameterValue : String
name           : FilePath
type           : @{name=String; uri=}
required       : true
variableLength : false
globbing       : false
pipelineInput  : false
position       : 2
aliases        :
```

So the properties we are interested in are named : `pipelineInput` and `globbing`. Let's add them to our custom object :

```powershell
Foreach ( $MandatoryParameter in $MandatoryParameters ) {
    
    $ParameterHelp = Get-Help $CmdString -Parameter $MandatoryParameter.Name

    $Props = [ordered]@{
        Name = $MandatoryParameter.Name
        'Parameter Set'= $MandatoryParameter.Attributes.ParameterSetName
        Position = $MandatoryParameter.Attributes.Position
        'Data Type' = $MandatoryParameter.ParameterType
        'Pipeline Input'=$ParameterHelp.pipelineInput
        'Accepts Wildcards'=$ParameterHelp.globbing
    }
    $Obj = New-Object -TypeName psobject -Property $Props
    $Obj
}
```

## Alias resolution  

As a bonus, we can make this work not just for cmdlets and functions, but for aliases as well.  
Aliases have a property named `Definition` which provides the name of the command the alias points to.  
So, if the user inputs an alias, we can use this to resolve the alias to the actual cmdlet or function, like so :

```powershell
If ( $CmdData.CommandType -eq 'Alias' ) {
    $CmdData = Get-Command (Get-Alias $CmdString).Definition
}
```

## Putting it all together  

The end result is a function using the techniques explained above :

```powershell
Function Get-MandatoryParameters {
    [CmdletBinding()]
    Param (
        [Parameter(Mandatory,Position=0)]
        [string]$CmdString
    )

    $CmdData = Get-Command $CmdString

    # If the $CmdString provided by the user is an alias, resolve to the cmdlet name
    If ( $CmdData.CommandType -eq 'Alias' ) {
        $CmdData = Get-Command (Get-Alias $CmdString).Definition
    }

    $MandatoryParameters = $CmdData.Parameters.Values | Where-Object { $_.Attributes.Mandatory }

    Foreach ( $MandatoryParameter in $MandatoryParameters ) {
    
        $ParameterHelp = Get-Help $CmdString -Parameter $MandatoryParameter.Name

        $Props = [ordered]@{
            Name = $MandatoryParameter.Name
            'Parameter Set'= $MandatoryParameter.Attributes.ParameterSetName
            Position = $MandatoryParameter.Attributes.Position
            'Data Type' = $MandatoryParameter.ParameterType
            'Pipeline Input'=$ParameterHelp.pipelineInput
            'Accepts Wildcards'=$ParameterHelp.globbing
        }
        $Obj = New-Object -TypeName psobject -Property $Props
        $Obj
    }
}
```
