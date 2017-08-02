---
title: A Boilerplate for Unit testing DSC resources with Pester
tags:
  - DevOps
  - DSC
  - Pester
---
Unit testing PowerShell code is slowly but surely becoming mainstream.  
[Pester](https://github.com/pester/Pester/wiki), the awesome PowerShell testing framework is playing a big part in that trend.  

> Why would you write more PowerShell code to test your PowerShell code ?  

Very basically, because :  
  - It gives you a better understanding of your code, its design, its assumptions  
  - It helps writing higher quality code : less buggy, more modular  
  - It tells you very quickly whether your code changes are breaking anything  

To help reduce the TTGT (Time to get started), I built a **Pester** script template which could be reused for unit testing **any** DSC resource.  
After all, DSC resources have a number of specific requirements and best practices, for example :  
  - `Get-TargetResource` should return a `[hashtable]`  
  - `Test-TargetResource` should return a `[Boolean]`  
  
So we can write tests for these requirements and these tests can be readily reused for any other MOF-based DSC resource.

Without further ado, here is the full script (which is also available [on GitHub](https://github.com/MathieuBuisson/PowerShell-DevOps/blob/master/DSC/Testing/Boilerplate.Tests.ps1)) and then we'll elaborate on the most interesting bits :

```powershell
$Global:DSCResourceName = 'My_DSCResource'  #<----- Just change this

Import-Module "$($PSScriptRoot)\..\..\DSCResources\$($Global:DSCResourceName)\$($Global:DSCResourceName).psm1" -Force

# Helper function to list the names of mandatory parameters of *-TargetResource functions
Function Get-MandatoryParameter {
    [CmdletBinding()]
    Param(
        [Parameter(Mandatory)]
        [string]$CommandName
    )
    $GetCommandData = Get-Command "$($Global:DSCResourceName)\$CommandName"
    $MandatoryParameters = $GetCommandData.Parameters.Values | Where-Object { $_.Attributes.Mandatory -eq $True }
    return $MandatoryParameters.Name
}

# Getting the names of mandatory parameters for each *-TargetResource function
$GetMandatoryParameter = Get-MandatoryParameter -CommandName "Get-TargetResource"
$TestMandatoryParameter = Get-MandatoryParameter -CommandName "Test-TargetResource"
$SetMandatoryParameter = Get-MandatoryParameter -CommandName "Set-TargetResource"

# Splatting parameters values for Get, Test and Set-TargetResource functions
$GetParams = @{    
}
$TestParams = @{    
}
$SetParams = @{    
}

Describe "$($Global:DSCResourceName)\Get-TargetResource" {
    
    $GetReturn = & "$($Global:DSCResourceName)\Get-TargetResource" @GetParams
    It "Should return a hashtable" {
        $GetReturn | Should BeOfType System.Collections.Hashtable
    }
    Foreach ($MandatoryParameter in $GetMandatoryParameter) {
        
        It "Should return a hashtable with key named $MandatoryParameter" {
            $GetReturn.ContainsKey($MandatoryParameter) | Should Be $True
        }
    }
}

Describe "$($Global:DSCResourceName)\Test-TargetResource" {
    
    $TestReturn = & "$($Global:DSCResourceName)\Test-TargetResource" @TestParams
    It "Should have the same mandatory parameters as Get-TargetResource" {
        # Does not check for $True or $False but uses the output of Compare-Object.
        # That way, if this test fails Pester will show us the actual difference(s).
        (Compare-Object $GetMandatoryParameter $TestMandatoryParameter).InputObject | Should Be $Null
    }
    It "Should return a boolean" {
        $TestReturn | Should BeOfType System.Boolean
    }
}

Describe "$($Global:DSCResourceName)\Set-TargetResource" {
    
    $SetReturn = & "$($Global:DSCResourceName)\Set-TargetResource" @SetParams
    It "Should have the same mandatory parameters as Test-TargetResource" {
        (Compare-Object $TestMandatoryParameter $SetMandatoryParameter).InputObject | Should Be $Null
    }
    It "Should not return anything" {
        $SetReturn | Should BeNullOrEmpty
    }
}
```

That's a lot of information so let's break it down into more digestible chunks :

```powershell
$Global:DSCResourceName = 'My_DSCResource'  #<----- Just change this
```

The `My_DSCResource` string is the only part in the entire script which needs to be changed from one DSC resource to another.  
All the rest can be reused for any DSC resource.

```powershell
Import-Module "$($PSScriptRoot)\..\..\DSCResources\$($Global:DSCResourceName)\$($Global:DSCResourceName).psm1" -Force
```

The relative path to the module containing the DSC resource is derived from a standard folder structure, with a `Tests` folder at the root of the module and a `Unit` subfolder, containing the resulting unit tests script, for example :

```powershell
C:\> tree /F "C:\Git\FolderPath\DscModules\DnsRegistration"
Folder PATH listing for volume OS

│   DnsRegistration.psd1
│
├───DSCResources
│   └───DnsRegistration
│       │   DnsRegistration.psm1
│       │   DnsRegistration.schema.mof
│       │
│       └───ResourceDesignerScripts
│               GenerateDnsRegistrationSchema.ps1
│
└───Tests
    └───Unit
            DnsRegistration.Tests.ps1
```

We load the module because we'll need to use the 3 functions it contains :  
  - `Get-TargetResource`  
  - `Set-TargetResource`  
  - `Test-TargetResource`  

This script is divided into 3 `Describe` blocks : this is a convention in unit testing with Pester : 1 `Describe` block per tested function.  

The `Force` parameter of `Import-Module` is to make sure that, even if the module was already loaded, we get the latest version of the module.

```powershell
Function Get-MandatoryParameter {
    [CmdletBinding()]
    Param(
        [Parameter(Mandatory)]
        [string]$CommandName
    )
    $GetCommandData = Get-Command "$($Global:DSCResourceName)\$CommandName"
    $MandatoryParameters = $GetCommandData.Parameters.Values | Where-Object { $_.Attributes.Mandatory -eq $True }
    return $MandatoryParameters.Name
}
```

This is a helper function used to get the mandatory parameter names for the `*-TargetResource` functions.  
If you use a more than a few helper functions in your unit tests, then you should probably gather them in a separate script or module.

```powershell
# Splatting parameters values for Get, Test and Set-TargetResource functions
$GetParams = @{    
}
$TestParams = @{    
}
$SetParams = @{    
}
```

These are placeholders to be completed with the parameters and values for `Get-TargetResource`, `Test-TargetResource` and `Set-TargetResource`, respectively.  
Splatting makes them more readable, especially for resources that have many parameters. We might use the same parameters and values for all 3 functions, in that case, we can consolidate these 3 hashtables into a single one.

```powershell
$GetReturn = & "$($Global:DSCResourceName)\Get-TargetResource" @GetParams
```

Specifying the resource name with the function allows to unambiguously call the `Get-TargetResource` function from the DSC resource we are currently testing.

```powershell
It "Should return a hashtable" {
        $GetReturn | Should BeOfType System.Collections.Hashtable
    }
```

The first actual test !  
This is validating that `Get-TargetResource` returns a object of the type `[hashtable]`. The `BeOfType` operator is designed specifically for verifying the type of an object so it's a great fit.

```powershell
Foreach ($MandatoryParameter in $GetMandatoryParameter) {
        
        It "Should return a hashtable with key named $MandatoryParameter" {
            $GetReturn.ContainsKey($MandatoryParameter) | Should Be $True
        }
    }
```

[An article from the PowerShell Team](https://blogs.msdn.microsoft.com/powershell/2013/11/15/hungry-for-more-windows-powershell-desired-state-configuration-resources/) says this :

> The Get-TargetResource returns the status of the modeled entities in a hash table format. This hash table must contain all properties, including the Read properties (along with their values) that are defined in the resource schema.  

I'm not sure this is a hard requirement because this is not enforced, and `Get-TargetResource` is not directly called by the DSC engine.  

We are getting the names of the mandatory parameters of `Get-TargetResource` and we check that the `[hashtable]` returned by `Get-TargetResource` has a key matching each of these parameters.  
Maybe, we could check against all parameters, not just the mandatory ones ?

Now, let's turn our attention to `Test-TargetResource` :

```powershell
    $TestReturn = & "$($Global:DSCResourceName)\Test-TargetResource" @TestParams

    It "Should have the same mandatory parameters as Get-TargetResource" {
        (Compare-Object $GetMandatoryParameter $TestMandatoryParameter).InputObject | Should Be $Null
    }
```

This test is validating that the mandatory parameters of `Test-TargetResource` are the same as for `Get-TargetResource`.  
There is a `PSScriptAnalyzer` rule for that, with an `Error` severity, so we can safely assume that this is a widely accepted and important best practice.

Reading the name of this `It` block, we could assume that it is checking against `$True` or `$False`.  
But here, we use `Compare-Object` to validate that there is no difference between the 2 lists of mandatory parameters. This is to make the test failure message more useful : it will tell us the offending parameter name(s).

```powershell
    It "Should return a boolean" {
        $TestReturn | Should BeOfType System.Boolean
    }
```

The function `Test-TargetResource` should always return a boolean.  
This is a well known requirement and this is also explicitly specified in the templates generated by `xDSCResourceDesigner`, so there is no excuse for not following this rule.

Now, it is time to test `Set-TargetResource` :

```powershell
    It "Should have the same mandatory parameters as Test-TargetResource" {
        (Compare-Object $TestMandatoryParameter $SetMandatoryParameter).InputObject | Should Be $Null
    }
```

The same as before, but this time we validate that the mandatory parameters of the currently tested function (`Set-TargetResource`) are the same as for `Test-TargetResource`.

```powershell
    It "Should not return anything" {
        $SetReturn | Should BeNullOrEmpty
    }
```

`Set-TargetResource` should not return anything.

That's it for the script.  

But then, a boilerplate is more useful when it is readily available as a snippet on your IDE of choice.  
So I made it into a <strong>Visual Studio Code</strong> snippet, this is the first snippet in the file [available here](https://github.com/MathieuBuisson/PowerShell-DevOps/blob/master/VisualStudioCode/PowerShell.json).

The snippet file should be store as : `%APPDATA%\Code\User\snippets\PowerShell.json`.  
Or, for those of us using the PowerShell extension, we can modify the existing file at : `%USERPROFILE%\.vscode\extensions\ms-vscode.PowerShell-0.6.1\snippets\PowerShell.json`.

Obviously, this set of tests is pretty basic and doesn't cover the code written specifically for a given resource, but it's a starting point. This allows to write basic unit tests for our DSC resources in just a few minutes.  
So now, there's no excuse for not doing it.
