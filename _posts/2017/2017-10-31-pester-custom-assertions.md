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

But in some cases, it is possible that none of these operators fit the type of assertion/comparison needed in our tests.  
For example, let's say we need to validate that a number is within an **inclusive** range. With the built-in operators we are limited to the `BeGreaterThan` and `BeLessThan`, so our test would look like this :  

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

Instead of comparing the value to the *expected* low end of the range (0), we have to compare it with the "*expected*" minus "*just a little bit*" to ensure that the assertion passes if the value **equals** the *expected* low end of the range. A similar gymnastic is needed when asserting the high end of the range.  

This is not only confusing, but also unreliable. The precision of the assertion depends on how small is the "*just a little bit*", or in other words, how many decimal places we add/remove to the "*expected*" part of the assertion.  

This whole thing feels wrong so let's write a better assertion using a custom `Should` operator.  

## Writing a custom Should operator  

There isn't much documentation nor examples out there yet, so for now, the best place to start is [this example in the Pester wiki](https://github.com/pester/Pester/wiki/Add-AssertionOperator).  

Our custom operator is going to be named `BeInRange` and unlike the examples we can find, it will require 2 values to represent the "*expected*" part of the assertion :  
  - `$Min` for the low end of the range  
  - `$Max` for the high end of the range  

So here is what the assertion operator function `BeInRange` looks like :  
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
First thing to note : the parameter representing the "*actual*" part of the assertion has to be named `ActualValue`. If not, **Pester**'s internal function `Invoke-Assertion` blows up because it calls any assertion function with the `ActualValue` parameter to pass the asserted value.  

All `Should` operators can be negated by inserting `-Not` before them. For our custom operator to respect this behavior, we need to implement the `Negate` switch parameter, as seen above.  

> What's the deal with the triple braces in the `$FailureMessage` string ?  

  - Brace #1 : The string formatting operator (`-f`) uses `{}` as placeholders  
  - Brace #2 : We enclose the currently asserted values in `{}` to be consistent with built-in assertion's failure messages  
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

We put our `BeInRange` function in a module named `CustomAssertions.psm1` to make it easy to reuse. We could even store the module within a location in our `$Env:PSModulePath` to allow importing it by name, instead of by path.  

There is another way : put the custom operator function in a .ps1 file inside **Pester**'s assertions folder : `"$((Get-Module Pester).ModuleBase)\Functions\Assertions\"`.  
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

As we can see above, the assertions using the `BeInRange` operator are simpler and more readable than the initial example using the built-in operators.  

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
    $Now = [datetime]::Now

    It 'The 1st of October 2017 should be in the range representing the current year' {
        $YearStart = Get-Date -Month 1 -Day 1
        $YearEnd = Get-Date -Month 12 -Day 31
        $FirstOct = Get-Date -Year 2017 -Month 10 -Day 1
        $FirstOct | Should -BeInRange -Min $YearStart -Max $YearEnd
    }
    It 'Today at 10 AM should be between today at 01 AM and now' {
        $DayStart = Get-Date -Hour 1 -Minute 0
        Get-Date -Hour 10 -Minute 0 | Should -BeInRange -Min $DayStart -Max $Now
    }
    It 'Now should not be in the range representing last month' {
        $LastMonthStart = (Get-Date -Day 1 -Hour 0 -Minute 0).AddMonths(-1)
        $LastMonthEnd = (Get-Date -Day 1 -Hour 0 -Minute 0).AddMinutes(-1)
        $Now | Should -Not -BeInRange -Min $LastMonthStart -Max $LastMonthEnd
    }
    It 'Now should not be in a range located in the future' {
        $FutureStart = Get-Date -Year 2117
        $FutureEnd = Get-Date -Year 2217
        $Now | Should -Not -BeInRange -Min $FutureStart -Max $FutureEnd
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
Indeed, it does work for these 3 types of objects.  

Now that we know that the "*expected*" part of the assertion can be comprised of multiple values, this enables complex or specialized assertions. Let's try a more complex assertion operator which may be useful in infrastructure validation scenarios.  

## Asserting that an IP address is in a given subnet  

We are going to write a new function named `BeInSubnet` containing logic to check if an IPv4 address is in the same subnet as a specified address (this can be the network ID but it doesn't have to be) and a specified subnet mask. We'll add it to our existing **CustomAssertions** module.  

Here is the function :  
{% raw %}
```powershell
Function BeInSubnet {
<#
.SYNOPSIS
Tests whether an IPv4 address in the same subnet as a given address with a given subnet mask.
#>
    [CmdletBinding()]
    Param(
        $ActualValue,
        $Network,
        $Mask,
        [switch]$Negate
    )
    If ( $ActualValue -isnot [ipaddress] ) {
        $ActualValue = $ActualValue -as [ipaddress]
    }
    If ( $Network -isnot [ipaddress] ) {
        $Network = $Network -as [ipaddress]
    }
    If ( $Mask -isnot [ipaddress] ) {
        $Mask = $Mask -as [ipaddress]
    }

    $ActualNetworkBinary = $ActualValue.Address -band $Mask.Address
    $ExpectedNetworkBinary = $Network.Address -band $Mask.Address

    [bool]$Pass = $ActualNetworkBinary -eq $ExpectedNetworkBinary
    If ( $Negate ) { $Pass = -not($Pass) }

    If ( -not($Pass) ) {
        $ActualSubnetString = ($ActualNetworkBinary -as [ipaddress]).IPAddressToString
        If ( $Negate ) {
            $FailureMessage = 'Expected: address {{{0}}} to be outside subnet {{{1}}} with mask {{{2}}} but was within it.' -f $ActualValue.IPAddressToString, $Network.IPAddressToString, $Mask.IPAddressToString
        }
        Else {
            $FailureMessage = 'Expected: address {{{0}}} to be in subnet {{{1}}} with mask {{{2}}} but was in subnet {{{3}}}.' -f $ActualValue.IPAddressToString, $Network.IPAddressToString, $Mask.IPAddressToString, $ActualSubnetString
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
The function's parameters don't enforce a specific `[type]`, this is to make the function more flexible. That way, the assertions using this operator will be able to pass `[string]` or `[ipaddress]` objects into it.  

This is why we check the type of each value passed via the function's parameters `$ActualValue`, `$Network`, `$Mask` and convert them to the type `[ipaddress]` for further manipulation.  

The rest of the function is fairly similar to our previous custom operator function.  

Then, we create a tests script (`BeInSubnet.Tests.ps1`) to verify that our `BeInSubnet` custom assertion operator behaves as expected :  

```powershell
Import-Module "$PSScriptRoot\CustomAssertions.psm1" -Force
Add-AssertionOperator -Name 'BeInSubnet' -Test $Function:BeInSubnet

Describe 'BeInSubnet assertions' {
    Context 'Assertions on [string] objects' {

        It '"10.1.5.193" should be in the same subnet as "10.1.5.0" with mask "255.255.255.0"' {
            '10.1.5.193' | Should -BeInSubnet -Network '10.1.5.0' -Mask '255.255.255.0'
        }
        It '"10.1.5.0" should be in the same subnet as "10.1.5.0" with mask "255.255.255.0"' {
            '10.1.5.0' | Should -BeInSubnet -Network '10.1.5.0' -Mask '255.255.255.0'
        }
        It '"10.1.5.193" should be in the same subnet as "10.1.5.0" with mask "255.0.0.0"' {
            '10.1.5.193' | Should -BeInSubnet -Network '10.1.5.0' -Mask '255.0.0.0'
        }
        It '"10.1.5.193" should not be in the same subnet as "10.1.5.0" with mask "255.255.255.128"' {
            '10.1.5.193' | Should -Not -BeInSubnet -Network '10.1.5.0' -Mask '255.255.255.128'
        }
        It 'Should fail (to verify the failure message)' {
            '10.1.5.193' | Should -BeInSubnet -Network '10.1.5.0' -Mask '255.255.255.128'
        }
    }
    Context 'Assertions on [ipaddress] objects' {
        $Value = '10.1.5.193' -as [ipaddress]
        $Network = '10.1.5.0' -as [ipaddress]
        $SubnetMask = '255.255.255.0' -as [ipaddress]
        $LargeSubnetMask = '255.0.0.0' -as [ipaddress]
        $SmallSubnetMask = '255.255.255.128' -as [ipaddress]
        
        It '"10.1.5.193" should be in the same subnet as "10.1.5.0" with mask "255.255.255.0"' {
            $Value | Should -BeInSubnet -Network $Network -Mask $SubnetMask
        }
        It '"10.1.5.0" should be in the same subnet as "10.1.5.0" with mask "255.255.255.0"' {
            $Network | Should -BeInSubnet -Network $Network -Mask $SubnetMask
        }
        It '"10.1.5.193" should be in the same subnet as "10.1.5.0" with mask "255.0.0.0"' {
            $Value | Should -BeInSubnet -Network $Network -Mask $LargeSubnetMask
        }
        It '"10.1.5.193" should not be in the same subnet as "10.1.5.0" with mask "255.255.255.128"' {
            $Value | Should -Not -BeInSubnet -Network $Network -Mask $SmallSubnetMask
        }
        It 'Should fail (to verify the failure message)' {
            $Value | Should -BeInSubnet -Network $Network -Mask $SmallSubnetMask
        }
    }
}
```
The tests are clean and readable. Now, imagine if we had to do the same assertions with the built-in `Should` operators... The tests script would have been cluttered with a large amount of `[ipaddress]` manipulation code, unless this code was extracted into a helper function.  

Let's run these tests and check the result :  

```powershell
C:\> $SubnetTestsPath = 'C:\CustomAssertions\BeInSubnet.Tests.ps1'
C:\> Invoke-Pester -Script $SubnetTestsPath
Executing all tests in 'C:\CustomAssertions\BeInSubnet.Tests.ps1'

Executing script C:\CustomAssertions\BeInSubnet.Tests.ps1

  Describing BeInSubnet assertions

    Context Assertions on [string] objects
      [+] "10.1.5.193" should be in the same subnet as "10.1.5.0" with mask "255.255.255.0" 138ms
      [+] "10.1.5.0" should be in the same subnet as "10.1.5.0" with mask "255.255.255.0" 20ms
      [+] "10.1.5.193" should be in the same subnet as "10.1.5.0" with mask "255.0.0.0" 23ms
      [+] "10.1.5.193" should not be in the same subnet as "10.1.5.0" with mask "255.255.255.128" 23ms
      [-] Should fail (to verify the failure message) 27ms
        Expected: address {10.1.5.193} to be in subnet {10.1.5.0} with mask {255.255.255.128} but was in subnet {10.1.5.128}.
        20:             '10.1.5.193' | Should -BeInSubnet -Network '10.1.5.0' -Mask '255.255.255.128'
        at Invoke-Assertion, C:\Program Files\WindowsPowerShell\Modules\Pester\4.0.8\Functions\Assertions\Should.ps1: line 209
        at <ScriptBlock>, C:\CustomAssertions\BeInSubnet.Tests.ps1: line 20

    Context Assertions on [ipaddress] objects
      [+] "10.1.5.193" should be in the same subnet as "10.1.5.0" with mask "255.255.255.0" 80ms
      [+] "10.1.5.0" should be in the same subnet as "10.1.5.0" with mask "255.255.255.0" 26ms
      [+] "10.1.5.193" should be in the same subnet as "10.1.5.0" with mask "255.0.0.0" 28ms
      [+] "10.1.5.193" should not be in the same subnet as "10.1.5.0" with mask "255.255.255.128" 18ms
      [-] Should fail (to verify the failure message) 29ms
        Expected: address {10.1.5.193} to be in subnet {10.1.5.0} with mask {255.255.255.128} but was in subnet {10.1.5.128}.
        43:             $Value | Should -BeInSubnet -Network $Network -Mask $SmallSubnetMask
        at Invoke-Assertion, C:\Program Files\WindowsPowerShell\Modules\Pester\4.0.8\Functions\Assertions\Should.ps1: line 209
        at <ScriptBlock>, C:\CustomAssertions\BeInSubnet.Tests.ps1: line 43
Tests completed in 418ms
Tests Passed: 8, Failed: 2, Skipped: 0, Pending: 0, Inconclusive: 0
```
Good, everything works as expected.  

Also, we can see that the failure message is quite helpful. It tells us exactly what is going on, with the "*actual*" values and the "*expected*" values. This is a major advantage of custom assertions, it enables us to create more meaningful failure messages because these messages can be tailored for specific assertions.  

## Conclusion  

While there are a few quirks to iron out to make this feature fully usable and mature, the ability to extend **Pester**'s assertion operators with simple PowerShell functions is very powerful.  

This allows to perform very complex or specialized assertions in our tests while keeping them relatively human-readable and remaining true to **Pester**'s <abbr title="Domain Specific Language">DSL</abbr>. This expands **Pester**'s assertions capabilities, as well as its use cases.  

Don't go too crazy, though. I would advise keeping the complexity of the assertion logic to a minimum, because the more complexity, the more chance that something may not work completely as expected. And we want assertions to be **very reliable**, we want tests to fail because the code under test doesn't behave as intended, **not the assertion logic**.