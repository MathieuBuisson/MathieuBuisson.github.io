---
title: Integrating PSScriptAnalyzer in an Appveyor Continuous Integration pipeline
tags: [DevOps, PowerShell]
---

Many of us who are writing PowerShell code are using [Appveyor](https://ci.appveyor.com) (especially for personal projects).  
And most of us use this to run Pester tests. Automated testing is great, it allows to set a certain standard of code quality without slowing down code delivery.  

But, this is just checking that the code behaves as we intended to.  

> What about code consistency, style, readability and following best practices ?  

This is where a static code analysis tool like [PSScriptAnalyzer](https://github.com/PowerShell/PSScriptAnalyzer) comes in.  
Even though `PSScriptAnalyzer` is a perfect fit in a PowerShell "build" process, searching the web for *integrating PSScriptAnalyzer and Appveyor* doesn't yield very helpful results. So here is the solution I came up with :

```yaml
version: 1.0.{build}
os: WMF 5
# Skip on updates to the readme
skip_commits:
  message: /readme*/
  
install:
  - ps: Install-PackageProvider -Name NuGet -Force
  - ps: Install-Module PsScriptAnalyzer -Force
  
build: false
test_script:
  - ps: |
      Add-AppveyorTest -Name "PsScriptAnalyzer" -Outcome Running
      $Results = Invoke-ScriptAnalyzer -Path $pwd -Recurse -Severity Error -ErrorAction SilentlyContinue
      If ($Results) {
        $ResultString = $Results | Out-String
        Write-Warning $ResultString
        Add-AppveyorMessage -Message "PSScriptAnalyzer output contained one or more result(s) with 'Error' severity.`
        Check the 'Tests' tab of this build for more details." -Category Error
        Update-AppveyorTest -Name "PsScriptAnalyzer" -Outcome Failed -ErrorMessage $ResultString
        
        # Failing the build
        Throw "Build failed"
      }
      Else {
        Update-AppveyorTest -Name "PsScriptAnalyzer" -Outcome Passed
      }
```

This the content of my `appveyor.yml` file, which is the file from which Appveyor gets the build configuration.

### Line 3 :  
This indicates from which VM template the build agent will be deployed.  
As its name indicates, this allows to have a build agent running in a VM with PowerShell version 5.  
PowerShell 5 means we can easily add PowerShell scripts, modules and DSC resources to our build agent from the PowerShell Gallery using the `PackageManagement` module.

### Line 10-11 :  
This is exactly what we do here. But first, because the PowerShell Gallery relies on NuGet, we need to install the NuGet provider.  
Then, we can install any PowerShell module we want from the PowerShell Gallery, <strong>PsScriptAnalyzer </strong>in this case.  
We didn't specify the repository because the PowerShell Gallery is the default one.

### Line 13 :  
This refers specifically to `MSBuild` and we don't need or want `MSBuild` for a PowerShell project.

### Line 15-End :  
This is where all the `PSScriptAnalyzer` stuff goes.  
So from an Appveyor point of view, this will be a test. Even though static code analysis is not testing, it kinda makes sense : we are assessing the code against a set of rules which represent a certain standard and we want a **Pass** or a **Fail** depending on whether the code meets the standard or not.

### Line 16 :  
In YAML, the pipe character `|` allows values to span multiple lines.  
This is very convenient for code blocks, like here. That way, we don't need to add "`- ps:`" at the beginning of each line.

### Line 17 :  
Appveyor doesn't have a direct integration with `PSScriptAnalyzer` like it has for some testing frameworks (NUnit, MSTest) but it's OK. The Appveyor worker [provides a REST API](https://www.appveyor.com/docs/build-worker-api) and even a few PowerShell cmdlets leveraging this API.  

One of these cmdlets is `Add-AppveyorTest`. Using this cmdlet, we are adding a new test, giving it a name and telling the build agent that the test is in the "Running" state.

### Line 18 :  
We run `PSScriptAnalyzer` against all the files in the current directory, recursively.  
We specify the `Error` severity, because we don't want a violation of severity `Information` or even `Warning` to make the test fail.  
We store the result in a variable for later use.

### Line 20 :  
If there are any "errors" from `PSScriptAnalyzer` perspective, we want to display them as a message in the build console and in the error message of the "test".  
That's why we need to convert the output object(s) from `PSScriptAnalyzer` to a string.

### Line 21 :  
Writing the violation(s) to the build console.  
We could use `Write-Host` or `Write-Output` as well but as we'll see in a later screenshot, the warning stream makes it stand out more visibly.

### Line 22 :  
This Appveyor-specific cmdlet adds a message to the build's **Messages** tab. Specifying `Error` for the category just displays the message with a touch of red.

### Line 24 :  
`Update-AppveyorTest` is another cmdlet leveraging the Appveyor build worker API. Here, we are using it to update the status of our existing test and add an error message to it.  

This message is `PSScriptAnalyzer` output converted to a string, so we can read it in the **Tests** tab in Appveyor UI :
![ScriptAnalyzer error]({{ site.url }}/images/2016-05-19-psscriptanalyzer-appveyor-error.png)

### Line 27 :  
We need to use `Throw` to explicitly fail the build. Otherwise, the build is considered as succeeded, even if our "test" fails.

### Line 30 :  
If `PSScriptAnalyzer` didn't output anything, meaning if there were no finding of the `Error` severity in any file, we considered that our project passes the test. Again, we use `Update-AppveyorTest` but this time, we tell it that the outcome is a **Pass**.

Do you like watching *Fail* videos on Youtube ?  
If yes, you are probably dying to see my build fail, right ? So, here we go :

![Appveyor Build failure]({{ site.url }}/images/2016-05-19-psscriptanalyzer-appveyor-build-failure.png)

Wow, the yellow background of the warning stream is not elegant but it sure stands out !

This is it.  
<strong>PSScriptAnalyzer</strong> is an important tool that any PowerShell scripter should use. <strong>Appveyor </strong>is awesome, so combining both of these tools is pretty powerful.
