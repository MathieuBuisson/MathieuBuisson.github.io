---
title: 'Writing and Using Custom Assertions for Pester Tests'
tags: [PowerShell, Pester]
---

[Pester](https://github.com/pester/Pester), the awesome PowerShell testing framework has recently introduced a capability which allows us to extend our test assertions. This allows to simplify our tests by abstracting custom or complex assertion logic away from the tests and into separate scripts or modules.  

Keeping the test scripts as clean and readable as possible is central to leveraging the simplicity and elegance of Pester's <abbr title="Domain Specific Language">DSL</abbr>. Also, I really like the idea that test scripts can act as an **executable** (potentially business-readable) **specification**.  

Concretely, "*custom assertions*" means that we can plug additional operators into **Pester**'s assertion function : `Should`. Assuming we are using the `Pester` version 4.0.8, there are quite a few built-in `Should` operators :  

```powershell
C:\> $PesterPath = (Get-Module -Name 'Pester' -ListAvailable)[0].ModuleBase
C:\> $AllItems = (Get-ChildItem "$PesterPath\Functions\Assertions\").BaseName
C:\> $AllItems.Where({ $_ -notmatch 'Should|Set-' })
Be
BeGreaterThan
BeIn
BeLessThan
BeLike
BeLikeExactly
BeNullOrEmpty
BeOfType
Exist
FileContentMatch
FileContentMatchExactly
FileContentMatchMultiline
Match
MatchExactly
PesterThrow
```

But it is possible that none of these operators fits the type of assertions or comparisons needed in our tests.  
For example, let's say we need to test that a number is within an **inclusive** range. With the built-in operators we are limited to the `BeGreaterThan` and `BeLessThan`, so our test would look like this :  

```powershell
Describe 'Built-in assertions with numbers' {
    It '55.5 should be in range [0-100]' {
        55.5 | Should -BeGreaterThan -0.000001
        55.5 | Should -BeLessThan 100.000001
    }
}
```
First, it forces us to have 2 assertions in a single test, which is not ideal.  
Second, because we want an **inclusive** range and there is no inclusive operators like `BeGreaterThanOrEqualTo` or `BeLessThanOrEqualTo`, we have to modify the "*expected*" part of the assertion.  

Instead of comparing the value to the *expected* low end of the range (0), we have to compare it with the "*expected*" minus "*just a little bit*" to ensure that the assertion passes if the value **equals** the *expected* low end of the range (0). A similar gymnastic is needed when asserting the high end of the range.  

This is not only confusing, but also unreliable. The precision of the assertion depends on how small is the "*just a little bit*", or in other words, how many decimal places we add/remove to the "*expected*" part of the assertion.  

This whole thing feels wrong so let's write a better assertion using a custom `Should` operator.  

## Writing a custom Should operator  

There isn't much documentation nor examples out there, so for now, the best place to start is [this example in the Pester wiki](https://github.com/pester/Pester/wiki/Add-AssertionOperator).  

Our custom operator is going to be named `BeInRange` and unlike the examples we can find, it will require 2 values to represent the "*expected*" part of the assertion :  
  - `$Min` for the low end of the range  
  - `$Max` for the high end of the range  

So here what the assertion operator function `BeInRange` looks like :  
{% raw %}
```powershell
Function BeInRange {
<#
.SYNOPSIS
Tests whether a value is in a given inclusive range
#>
    [CmdletBinding()]
    Param(
        $ActualValue,
        $Min,
        $Max,
        [switch]$Negate
    )

    [bool]$Pass = $ActualValue -ge $Min -and $ActualValue -le $Max
    If ( $Negate ) { $Pass = -not($Pass) }

    If ( -not($Pass) ) {
        If ( $Negate ) {
            $FailureMessage = 'Expected: value {{{0}}} to be outside the range {{{1}-{2}}} but it was in the range.' -f $ActualValue, $Min, $Max
        }
        Else {
            $FailureMessage = 'Expected: value {{{0}}} to be in the range {{{1}-{2}}} but it was outside the range.' -f $ActualValue, $Min, $Max
        }
    }

    $ObjProperties = @{
        Succeeded      = $Pass
        FailureMessage = $FailureMessage
    }
    return New-Object PSObject -Property $ObjProperties
}
```
{% endraw %}
First thing to note : the parameter representing the value being passed into the assertion has to be named `ActualValue`. If it is named anything else, **Pester**'s internal function `Invoke-Assertion` blows up because it calls any assertion function with the `ActualValue` parameter to pass the asserted value.  

All `Should` operators can be negated by inserting `-Not`  before them. For our custom operator to respect this behavior, we need to implement the `Negate` switch parameter, as seen above.  

> What's the deal with the triple braces in the `$FailureMessage` string ?  

  - Brace #1 : The string formatting operator (`-f`) uses `{}` as placeholders  
  - Brace #2 : We enclose the current values used in the assertion in `{}` to be consistent with built-in assertion's failure messages  
  - Brace #3 : The string formatting operator freaks out if the string contains braces, so we double the second set of braces to escape them

Our assertion operator function has a contractual obligation : it has to return an object of the type `[PSObject]` with a property named `Succeeded` and a property named `FailureMessage`. So we built `$ObjProperties` accordingly.  

How do we know that ?  

```powershell
C:\> Get-Help 'Add-AssertionOperator' -Parameter 'Test'

-Test <ScriptBlock>
    The test function. The function must return a PSObject with a [Bool]succeeded
    and a [string]failureMessage property.

    Required?                    true
    Position?                    2
    Default value
    Accept pipeline input?       false
    Accept wildcard characters?  false
```

## Using a custom Should operator in our tests  

We put our `BeInRange` function inside a module named `CustomAssertions.psm1` to make it easy to reuse. We could even store the module within a location in our `$Env:PSModulePath` to allow importing it by name, instead of by path.  

There is another way : put the custom operator function in a .ps1 file in the following directory : `"$((Get-Module Pester).ModuleBase)\Functions\Assertions\"`.  
**Pester** picks up the operators automatically from this location but this might be less flexible, so choose a method based on your preference/scenario.  

Now is the time to write tests to verify how much cleaner our assertions can be with our custom operator and ensure that it behaves as expected :  
```powershell
Import-Module "$PSScriptRoot\CustomAssertions.psm1" -Force
Add-AssertionOperator -Name 'BeInRange' -Test $Function:BeInRange

Describe 'BeInRange assertions with numbers' {
    It '55.5 should be in range [0-100]' {
        55.5 | Should -BeInRange -Min 0 -Max 100
    }
    It '0 should be in range [0-100] (inclusive range)' {
        0 | Should -BeInRange -Min 0 -Max 100
    }
    It '80 should not be in range [0-55.5]' {
        80 | Should -Not -BeInRange -Min 0 -Max 55.5
    }
    It 'Should fail (to verify the failure message)' {
        1 | Should -BeInRange -Min 10 -Max 20
    }
}
```
The first line imports the module to make our `BeInRange` function visible in the global scope to ensure `Add-AssertionOperator` will see it.  

`Add-AssertionOperator` is the function from **Pester** which enables the magic. It registers a custom assertion operator function with **Pester** which integrates it with the `Should` function as a dynamic parameter. Clever stuff.  

Unfortunately, as soon as we run this tests script more than once (without unloading the `Pester` module), we get this error :  

```powershell
Executing script .\CustomAssertions.Tests.ps1
  [-] Error occurred in test script '.\CustomAssertions.Tests.ps1' 35ms
    RuntimeException: Assertion operator name 'BeInRange' has been added multiple times.
    at Assert-AssertionOperatorNameIsUnique, C:\Program Files\WindowsPowerShell\Modules\Pester\4.0.8\Pester.psm1: line 243
    at Add-AssertionOperator, C:\Program Files\WindowsPowerShell\Modules\Pester\4.0.8\Pester.psm1: line 211
    at <ScriptBlock>, C:\CustomAssertions\CustomAssertions.Tests.ps1: line 2
    at <ScriptBlock>, C:\Program Files\WindowsPowerShell\Modules\Pester\4.0.8\Pester.psm1: line 802
    at Invoke-Pester<End>, C:\Program Files\WindowsPowerShell\Modules\Pester\4.0.8\Pester.psm1: line 817
```
Thankfully [this bug](https://github.com/pester/Pester/issues/891) is fixed in the master branch and slated for milestone 4.1.  

The assertions using the `BeInRange` operator are more straightforward and readable than the initial example using the built-in operators.  

Now let's see if it works :  

```powershell
C:\> $TestsPath = 'C:\CustomAssertions\CustomAssertions.Tests.ps1'
C:\> Invoke-Pester -Script $TestsPath
Executing all tests in 'C:\CustomAssertions\CustomAssertions.Tests.ps1'

Executing script C:\CustomAssertions\CustomAssertions.Tests.ps1

  Describing BeInRange assertions with numbers
    [+] 55.5 should be in range [0-100] 94ms
    [+] 0 should be in range [0-100] (inclusive range) 53ms
    [+] 80 should not be in range [0-55.5] 51ms
    [-] Should fail (to verify the failure message) 38ms
      Expected: value {1} to be in the range {10-20} but it was outside the range.
      15:         1 | Should -BeInRange -Min 10 -Max 20
      at Invoke-Assertion, C:\Program Files\WindowsPowerShell\Modules\Pester\4.0.8\Functions\Assertions\Should.ps1: line 209
      at <ScriptBlock>, C:\CustomAssertions\CustomAssertions.Tests.ps1: line 15
Tests completed in 237ms
Tests Passed: 3, Failed: 1, Skipped: 0, Pending: 0, Inconclusive: 0
```
This works as expected.  

But does it work with objects of the type `[string]` ? This would allow us to do assertions related to alphabetical ordering.  
How about `[datetime]` objects ? This would allow to validate that a `[datetime]` value is within an expected date (or time) range.  

We add the following tests to our tests script :  
```powershell
Context 'Assertions on [string] objects' {

    It '"abcd" should be in range ["ab"-"yz"]' {
        'abcd' | Should -BeInRange -Min 'ab' -Max 'yz'
    }
    It '"a" should be in range ["a"-"yz"]' {
        'a' | Should -BeInRange -Min 'a' -Max 'yz'
    }
    It '"az" should not be in range ["ab"-"aefg"]' {
        'az' | Should -Not -BeInRange -Min 'ab' -Max 'aefg'
    }
}
Context 'Assertions on [datetime] objects' {

    It 'The 1st of October 2017 should be in the range representing the current year' {
        $YearStart = Get-Date -Month 1 -Day 1
        $YearEnd = Get-Date -Month 12 -Day 31
        $FirstOct = Get-Date -Year 2017 -Month 10 -Day 1
        $FirstOct | Should -BeInRange -Min $YearStart -Max $YearEnd
    }
    It 'Today at 10 AM should be between today at 01 AM and now' {
        $DayStart = Get-Date -Hour 1 -Minute 0
        $Now = [datetime]::Now
        Get-Date -Hour 10 -Minute 0 | Should -BeInRange -Min $DayStart -Max $Now
    }
    It 'Now should not be in the range representing last month' {
        $Now = [datetime]::Now
        $LastMonthStart = (Get-Date -Day 1 -Hour 0 -Minute 0).AddMonths(-1)
        $LastMonthEnd = (Get-Date -Day 1 -Hour 0 -Minute 0).AddMinutes(-1)
        $Now | Should -Not -BeInRange -Min $LastMonthStart -Max $LastMonthEnd
    }
    It 'Now should not be in a range located in the future' {
        $FutureStart = Get-Date -Year 2117
        $FutureEnd = Get-Date -Year 2217
        [datetime]::Now | Should -Not -BeInRange -Min $FutureStart -Max $FutureEnd
    }
}
```
Then, we run the tests script again :  
```powershell
C:\> Invoke-Pester -Script $TestsPath                                                         
Executing all tests in 'C:\CustomAssertions\CustomAssertions.Tests.ps1'                       
                                                                                              
Executing script C:\CustomAssertions\CustomAssertions.Tests.ps1                               
                                                                                              
  Describing BeInRange assertions with numbers                                                
                                                                                              
    Context Assertions on numbers                                                             
      [+] 55.5 should be in range [0-100] 76ms                                                
      [+] 0 should be in range [0-100] (inclusive range) 27ms                                 
      [+] 80 should not be in range [0-55.5] 28ms                                             
      [-] Should fail (to verify the failure message) 28ms                                    
        Expected: value {1} to be in the range {10-20} but it was outside the range.          
        17:             1 | Should -BeInRange -Min 10 -Max 20                                 
        at Invoke-Assertion, C:\Program Files\WindowsPowerShell\Modules\Pester\4.0.8\Functions
\Assertions\Should.ps1: line 209                                                              
        at <ScriptBlock>, C:\CustomAssertions\CustomAssertions.Tests.ps1: line 17             
                                                                                              
    Context Assertions on [string] objects                                                    
      [+] "abcd" should be in range ["ab"-"yz"] 65ms                                          
      [+] "a" should be in range ["a"-"yz"] 26ms                                              
      [+] "az" should not be in range ["ab"-"aefg"] 16ms                                      
                                                                                              
    Context Assertions on [datetime] objects                                                  
      [+] The 1st of October 2017 should be in the range representing the current year 68ms   
      [+] Today at 10 AM should be between today at 01 AM and now 31ms                        
      [+] Now should not be in the range representing last month 32ms                         
      [+] Now should not be in a range located in the future 33ms                             
Tests completed in 436ms                                                                      
Tests Passed: 10, Failed: 1, Skipped: 0, Pending: 0, Inconclusive: 0
```
Indeed, this custom assertion does work for all these types of objects.  

Now that we know that the "*expected*" part of the assertion can be comprised of multiple values, this enables complex or specialized assertions. Let's try a more complex assertion operator which may be useful in infrastructure validation scenarios.  

## Asserting that an IP address is in an expected subnet  

