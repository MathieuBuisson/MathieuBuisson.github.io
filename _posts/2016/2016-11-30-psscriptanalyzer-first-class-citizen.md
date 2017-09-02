---
title: Making PSScriptAnalyzer a first-class citizen in a PowerShell CI pipeline
tags: [DevOps, Pester, Linting]
---

As you already know if you have read [this]({% post_url 2016/2016-05-19-psscriptanalyzer-appveyor %}) or [this]({% post_url 2016/2016-06-27-create-custom-rule-psscriptanalyzer %}), I'm a big fan of `PSScriptAnalyzer` to maintain a certain coding standard. This is especially powerful inside a release pipeline because this allows us to enforce that coding standard.  

In our <abbr title="Continuous Integration">CI</abbr> pipeline, we can easily make the build fail if our code violates `PSScriptAnalyzer` rule(s).  
That's great, but the main point of [continuous integration](http://martinfowler.com/articles/continuousIntegration.html) is to give quick feedback to developers about their code change(s). It is about catching problems early **to fix them** early. So the question is :  

> How can we make our CI tool publish `PSScriptAnalyzer` results with the information we need to remediate any violation ?  

All <abbr title="Continuous Integration">CI</abbr> tools have ways to publish test results to make them highly visible, to drill down into a test failure and do some reporting.  

Since we are talking about a **PowerShell** pipeline, we are most likely already using Pester to test our PowerShell code.  
Pester can spit out results in the same `XML` format as NUnit and these NUnit `XML` files can be consumed and published by most <abbr title="Continuous Integration">CI</abbr> tools.  

It makes a lot of sense to leverage this Pester integration as a universal <abbr title="Continuous Integration">CI</abbr> glue and run our `PSScriptAnalyzer` checks as Pester tests.  
Let's look at possible ways to do that.

## One Pester test checking PSScriptAnalyzer output  

Here is probably the simplest way to invoke `PSScriptAnalyzer` from Pester :  

```powershell
Describe 'PSScriptAnalyzer analysis' {    
    $ScriptAnalyzerResults = Invoke-ScriptAnalyzer -Path '.\Example.ps1' -Severity Warning
    
    It 'Should not return any violation' {
        $ScriptAnalyzerResults | Should BeNullOrEmpty
    }
}  
```

Here, we are checking all the rules which have a Warning severity within one single test.  
Then, we rely on the fact that if `PSScriptAnalyzer` returns something, it means that they were at least one violation and if `PSScriptAnalyzer` returns nothing, it's all good.  

There are 2 problems here :  

  - We are evaluating a whole bunch of rules in a single test, so the test name cannot tell us which rule was violated  
  - If there are more than one violation, the Pester message gives us useless information  

How useless ? Well, let’s see :  

```powershell
Invoke-Pester -Script '.\Example.Tests.ps1'
Executing all tests in .\Example.Tests.ps1

Executing script .\Example.Tests.ps1

  Describing PSScriptAnalyzer analysis
    [-] Should not return any violation 1.52s
      Expected: value to be empty but it was {Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord}
      at <ScriptBlock>, E:\Example.Tests.ps1: line 5
      5:         $ScriptAnalyzerResults | Should BeNullOrEmpty
Tests completed in 1.52s
Tests Passed: 0, Failed: 1, Skipped: 0, Pending: 0, Inconclusive: 0
```

The Pester failure message gives us the object type of the `PSScriptAnalyzer` results, instead of their contents.  

## One Pester test per PSScriptAnalyzer rule  

This is a pretty typical (and better) way of running `PSScriptAnalyzer` checks via Pester.

```powershell
Describe 'PSScriptAnalyzer analysis' {    
    $ScriptAnalyzerRules = Get-ScriptAnalyzerRule -Name "PSAvoid*"

    Foreach ( $Rule in $ScriptAnalyzerRules ) {
        It "Should not return any violation for the rule : $($Rule.RuleName)" {
            Invoke-ScriptAnalyzer -Path ".\Example.ps1" -IncludeRule $Rule.RuleName |
            Should BeNullOrEmpty
        }
    }
}
```

In this case, the first step is to get a list of the rules that we want to evaluate. Here, I changed the list of rules to : all rules which have a name starting with `PSAvoid`. This is just to show that we can filter the rules by name, as well as by severity.  

Then, we loop through this list of rules and have a Pester test evaluating each rule, one by one. As we can see below, the output is much more useful :  
![By ScriptAnalyzer Rule]({{ "/images/2016-11-30-psscriptanalyzer-first-class-citizen-by-rule.png" | absolute_url }})  

This is definitely better but we still encounter the same issue as before because there were more than one violation for that `PSAvoidUsingWMICmdlet` rule. So we still don't get the file name and the line number.  

We could use a nested loop : for each rule, we would loop through each file.  
That would be more granular and reduce the risk of this particular issue. But if a single file violated the same rule more than once, we would still have the same problem.  

So, I decided to go take a different route to address this problem : taking the output from `PSScriptAnalyzer` and converting it to a test result file, using the same `XML` schema as Pester and NUnit.

## Converting PSScriptAnalyzer output to a test result file  

For that purpose, I wrote a function named `Export-NUnitXml`, which is available [in this module](https://github.com/MathieuBuisson/PowerShell-DevOps/tree/master/Export-NUnitXml).  

Here are the high-level steps of what `Export-NUnitXml` does :  
  - Take the output of `PSScriptAnalyzer` as its input  
  - Create an `XML` document containing a "test-case" node for each input object(s)  
  - Write this `XML` document to the file specified via the `Path` parameter  

Here is an example of how we can use this within a build script (in [Appveyor](https://ci.appveyor.com), in this case) :  

```powershell
$ScriptAnalyzerRules = Get-ScriptAnalyzerRule -Severity Warning
$ScriptAnalyzerResult = Invoke-ScriptAnalyzer -Path '.\CustomPSScriptAnalyzerRules\Example.ps1' -IncludeRule $ScriptAnalyzerRules
If ( $ScriptAnalyzerResult ) {  
    $ScriptAnalyzerResultString = $ScriptAnalyzerResult | Out-String
    Write-Warning $ScriptAnalyzerResultString
}
Import-Module '.\Export-NUnitXml\Export-NUnitXml.psm1' -Force
Export-NUnitXml -ScriptAnalyzerResult $ScriptAnalyzerResult -Path '.\ScriptAnalyzerResult.xml'

(New-Object 'System.Net.WebClient').UploadFile("https://ci.appveyor.com/api/testresults/nunit/$($env:APPVEYOR_JOB_ID)", '.\ScriptAnalyzerResult.xml')
If ( $ScriptAnalyzerResult ) {        
    # Failing the build
    Throw 'There was PSScriptAnalyzer violation(s). See test results for more information.'
}   
```

And here is the result in Appveyor :  

![Appveyor Overview]({{ "/images/2016-11-30-psscriptanalyzer-first-class-citizen-overview.png" | absolute_url }})  

Just by reading the name of the test case, we get the essential information : the rule name, the file name and even the line number.  

Also, we can expand any failed test to get additional information.  
For example, the last 2 tests are expanded below :  

![Appveyor test details]({{ "/images/2016-11-30-psscriptanalyzer-first-class-citizen-details.png" | absolute_url }})  

The "**Stacktrace**" section provides additional details, like the rule severity and the actual offending code. Another nice touch is that the "**Error message**" section gives us the rule message, which normally provides an actionable recommendation to remediate the problem.  

> But, what if `PSScriptAnalyzer` returns nothing ?  

`Export-NUnitXml` does handle this scenario gracefully because its `ScriptAnalyzerResult` parameter accepts `$Null`. In this case, the test result file will contain only 1 test case and this test will pass.  

So now, we not only have quick feedback on our adherence to coding standards, but we also get actionable guidance on how to improve.  
And remember, this NUnit `XML` format is widely supported in the CI/CD tooling world, so this would work similarly in TeamCity, Microsoft VSTS, and others...
