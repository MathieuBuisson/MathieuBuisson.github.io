---
title: "Unit Testing with Pester : Storing complex Mock objects in a JSON file"
tags: [Pester, PowerShell]
---

When unit testing with Pester, [mocking](https://github.com/pester/Pester/wiki/Mock) is pretty much unavoidable, especially for code related to infrastructure, configuration, or deployment. We don't want our unit tests to touch files, databases, the registry, and not to mention the internet, do we ?  

With Pester's `Mock` function, we can isolate our code from this outside (hostile ?) world by faking commands and make them return whatever we want, even a custom object. Unfortunately, creating custom objects within the `Mock` is not ideal when dealing with complex Mock objects with nested properties.  

Let's see an example to understand why.

Let's say we need to unit test a simple function (`Get-ProcessModule`) that lists all modules (DLLs) loaded in the process(es) specified by name :  

```powershell
Function Get-ProcessModule {
    [CmdletBinding()]
    Param (
        [Parameter(Mandatory)]
        [string]$Name        
    )
    $Processes = Get-Process -Name $Name

    If ( $Processes ) {
        Foreach ( $Process in $Processes ) {
            $LoadedModules = $Process.Modules
            Foreach ( $LoadedModule in $LoadedModules ) {
                $CustomProps = @{
                    'Name'= $LoadedModule.ModuleName
                    'Version'= $LoadedModule.ProductVersion
                    'PreRelease' = $LoadedModule.FileVersionInfo.IsPreRelease
                }
            $CustomObj = New-Object -TypeName psobject -Property $CustomProps
            $CustomObj
            }
        }
    }
}
```

Nothing fancy here, but notice that we are looking at a property named `IsPreRelease` which is nested in the `FileVersionInfo` property which itself is nested within the `Modules` property of our Process objects.  

When unit testing this function, we don't know which process(es) are running, and which DLLs they have loaded. And we don't want to start new processes just for the sake of testing.  
So, we will need to Mock `Get-Process` and return fake process objects with the properties we need, including the `IsPreRelease` nested property.

The script to unit test this function would look like this :  

```powershell
$ScriptPath = "$PSScriptRoot\Get-ProcessModule.ps1"
. $ScriptPath

Describe 'Get-ProcessModule' {
    Context 'There is 1 running process with the specified name' {
        Mock Get-Process {
            [PSCustomObject]@{
                Modules = @( @{
                    ModuleName = 'Module1FromProcess1'
                    ProductVersion = '1.0.0.1'
                    FileVersionInfo = @{
                        IsPreRelease = $False
                    }
                } );
            }
        }
        It 'Returns the correct module name' {
            (Get-ProcessModule -Name 'Any').Name |
            Should Be 'Module1FromProcess1'
        }
        It 'Returns the correct module version' {
            (Get-ProcessModule -Name 'Any').Version |
            Should Be '1.0.0.1'
        }
        It 'Returns the correct PreRelease value' {
            (Get-ProcessModule -Name 'Any').PreRelease |
            Should Be $False
        }
    }
}
```

While this does work, I'm not a big fan of cluttering the test file with 10 lines of code for every single `Mock`.  
Imagine if we had a dozen (or more) different Mock objects to create, this would add up pretty quickly and make the test file difficult to follow.  

I really like the idea that test scripts can act as an **executable specification** so I think we should strive to keep our test files as concise and readable as possible.  
Granted, it's no [Gherkin](https://github.com/cucumber/cucumber/wiki/Gherkin), but [this might be coming](https://github.com/pester/Pester/issues/173)...  

Also, because these Mock objects are just fake objects with fake property values, they should be considered more as test data than code.  
So, applying the *separation of concerns* principle, we should probably separate this data from the testing logic and store it in a distinct file.  

Being a PowerShell kind of guy, my first choice was to use a standard PowerShell data file (`.psd1`). Let's see how this works out :  

```powershell
@{
    Process1 =  [PSCustomObject]@{
        Modules = @( @{
            ModuleName = 'Module1FromProcess1'
            ProductVersion = '1.0.0.1'
            FileVersionInfo = @{
                IsPreRelease = $False
            }
        } );
    }
}
```

We have to specify the type `PSCustomObject`, otherwise it would be a `hashtable` when imported back into PowerShell.  
Unfortunately, `Import-PowerShellDataFile` doesn't like that :  

![Import-PowerShellDataFile error]({{ "/images/2017-02-14-storing-mock-objects-in-json-error.png" | absolute_url }})  

This is because to safely import data, `Import-PowerShellDataFile` works in **RestrictedLanguage** mode. And in this mode, casting to a `PSCustomObject` (to any type, for that matter) is forbidden.

We could use `Invoke-Expression` instead, but we've been told that [Invoke-Expression is evil](https://blogs.msdn.microsoft.com/powershell/2011/06/03/invoke-expression-considered-harmful/), so we should probably look for another option.  

I heard that [JSON](http://www.json.org/) is a nice and lightweight format to store data, so let's try to use it to store our Mock objects.  
Here is the solution I came up with to represent Mock objects as `JSON` :  

```json
{
    "Get-Process": [
        {
            "1ProcessWithMatchingName": {
                "Modules": {
                    "ModuleName": "Module1FromProcess1",
                    "ProductVersion": "1.0.0.1",
                    "FileVersionInfo": {
                        "IsPreRelease": false
                    }
                }
            }
        },
        {
            "2ProcessesWithMatchingName": [
                {
                    "Modules": {
                        "ModuleName": "Module1FromProcess1",
                        "ProductVersion": "1.0.0.1",
                        "FileVersionInfo": {
                            "IsPreRelease": false
                        }
                    }
                },
                {
                    "Modules": {
                        "ModuleName": "Module1FromProcess2",
                        "ProductVersion": "2.0.0.1",
                        "FileVersionInfo": {
                            "IsPreRelease": true
                        }
                    }
                }
            ]
        }
    ]
}
```

For `true` and `false` to be treated as proper boolean values, they have to be all lower case.
{: .notice--warning }  

The data is organized hierarchically, as follow :  
  - The top level is the name of the mocked command  
  - The next level describes each scenario (or test case)  
  - The inner level is the actual object(s) that we want the `Mock` to return  

As we can see above, the second scenario (labelled "2ProcessesWithMatchingName") returns an array of 2 objects. We could make it return 3, or more, if we wanted to. We could also have multiple modules in some of our fake processes, but for illustration purposes, the above is enough.

We can import this data back into PowerShell with `ConvertFrom-Json` and explore the objects it contains, and their properties using what I call "dot-browsing" :

```powershell
C:\> $JsonMockData = Get-Content .\TestData\MockObjects.json -Raw
C:\> $Mocks = ConvertFrom-Json $JsonMockData
C:\> $2ndTestCase = $Mocks.'Get-Process'.'2ProcessesWithMatchingName'
C:\> $2ndTestCase.Modules

ModuleName          ProductVersion FileVersionInfo
----------          -------------- ---------------
Module1FromProcess1 1.0.0.1        @{IsPreRelease=False}
Module1FromProcess2 2.0.0.1        @{IsPreRelease=True}


C:\> $2ndTestCase.Modules.FileVersionInfo.IsPreRelease
False
True
   
```

Now, let's see how we can use this in our tests :
 href="http://theshellnut.com/wp-content/uploads/2017/02/TestSuiteWithJsonMocks.png"><img src="http://theshellnut.com/wp-content/uploads/2017/02/TestSuiteWithJsonMocks.png" alt="" width="700" height="936" class="alignnone size-full wp-image-2637" /></a>

Within each Context block, we get the Mock for a specific scenario that we have defined in our JSON data and store it into the ContextMock variable. Then, to define our Mock, we just specify that its return value is our ContextMock variable.

We can even use the ContextMock variable to get the expected values for the Should assertions, like in the first 2 tests above.

You might be wondering why the hell I would filter ContextMock with : `Where-Object { $_ }`, in the second Context block. Well, this is because importing arrays from JSON to PowerShell has a tendency to add $Null items in the resulting array.

In this case, $ContextMock contained 3 objects : the 2 fake process objects, as expected, and a $Null element. Why ? I have no idea, but I was able to get rid of it with the `Where-Object` statement above.

As we can see, it makes the tests cleaner and allows to define Mocks in an expressive way, so overall, I think this is a nice solution to manage complex Mock data.

That said, unit testing is still a relatively new topic in the PowerShell community, and I haven't heard or read anything on best practices around test data. So I'm curious, how do you guys handle Mock objects and more generally, test data ? Do you have any tips or techniques ?
