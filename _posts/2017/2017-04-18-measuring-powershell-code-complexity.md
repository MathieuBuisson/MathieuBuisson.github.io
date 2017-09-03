---
title: 'Measuring PowerShell code complexity : Why and How'
tags: [PowerShell, Quality]
excerpt_separator: "### "
---

## Why does code complexity matter ?  

As Administrators or engineers, we deal with complexity all the time.  
We build, document, support and deploy complex systems on a pretty-much-daily basis.  

> The expertise required to work with these systems is part of what makes us valuable.  
> So why should we strive to limit our code complexity ?  

Because complex code tends to have the following properties :  

### Difficult to read/understand  

Some believe that being the only one capable of using/maintaining their tool(s) makes them valuable to the team or business. Don't be that guy.  
If we write code which can be used and understood by others, it doesn't decrease our value, **it multiplies it**.  
Code (even automation scripts) tend to be read more often than it is written. So we should write our code to make it easy to understand for the next person who is going to read it.

### Difficult to test  

Generally, complex code means long, monolithic, non-modular code.  
Which means it is difficult to unit test, because many of the "units" are bundled together in a single big chunk of code. So testing any one of these units in isolation becomes almost impossible, even with mocking.  
On top of that, a complex piece of code will require many more tests than a simple one, to achieve the same level of code coverage (more on that later).

### More prone to bugs  

Complex code tends to contain a lot of logic, which leads to **many different code paths**.  
It is fairly easy to picture a correlation between complexity and the number of defects. A maze-like piece of code has **consequences that are difficult to understand and predict**. Some these unexpected consequences may very well be defects.

### Make bugs more difficult to identify, troubleshoot  

When we do encounter issues with complex code, the size of the code base and its complexity makes it more difficult and time-consuming to pinpoint where the problem is.

### Difficult to refactor/change/maintain  

To make changes to an existing code base, we first need to understand it. If the code is complex, it will take time and effort to understand.  
Also, making changes to a complex system tends to be risky because any change may have unintended/unexpected consequences.  
In other words, we may end up being scared of touching this code because **we might break other parts of the system** without even knowing it.  

Now that we are on the same page regarding complexity, we'll want to keep it under control. But to do that, we first need to be able to measure it.  

In this post, we are going to take a look at 2 different ways of measuring complexity and apply them to PowerShell code :  
  - Cyclomatic complexity  
  - Nesting depth  

## Cyclomatic complexity  

[Cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity) is the most widely used way of measuring code complexity. It has been used for decades, against many different programming languages, but I couldn't find any example of it being applied to PowerShell.  

It boils down to counting **the number of possible paths through a given section of code**. The section of code for which we measure complexity should represent the smallest unit of functionality.  
In object-oriented languages, this would generally be a method. In PowerShell, it would typically be a function.

Cyclomatic complexity has a nice benefit which makes it relevant in modern software delivery practices :  
**it has a strong inverse correlation with how testable the code is**.  
Indeed, if we want to achieve a test coverage of 100%, the tests need to exercise every possible code paths. This may be difficult or cumbersome to achieve for a piece of code which has dozens (or more) of possible code paths.  

The Cyclomatic complexity of a piece of code depends on the number of logic constructs it contains, because logic constructs are where **the flow of execution can branch out to 1 or more path(s)**.  

For example, a piece of code with no conditional logic has only 1 possible code path. If we add a `If` statement, we now have 2 possible paths : 1 for when the condition in the `If`statement is true and 1 for when it is false. So any `If` statement increases the Cyclomatic complexity by 1.  

So, let's look at all the PowerShell language constructs that can create branches (decisions) in the code flow, and their impact on Cyclomatic complexity :  

  - `If` :  Creates 1 additional code path  
  - `If/Else` : 1 additional code path (the `Else` clause does not cause a new decision)  
  - `If/ElseIf/Else` : 1 additional code path + 1 per `ElseIf` statement  
  - `Switch` (with a `Break` statement in each clause) : 1 additional path per clause, excluding the `Default` clause
  - `Switch` (with a `Break` statement in the clauses) : the number of possible paths explodes (my brain too : I couldn't find a formula to calculate the number of possible paths based of the number of clauses)  
  - Logical operators `-and`, `-or`, `-xor` : 1 additional path per operator  
  - `Try/Catch` : 1 additional path per `Catch` block. A `Finally` block doesn't create an additional path because it is always executed  
  - `Trap` statement : 1 additional path  

By the way, I am not making this up out of thin air, this is heavily based on Cyclomatic complexity calculation examples applied to other languages, like [this one](http://radon.readthedocs.io/en/latest/intro.html).

Looping constructs are a little bit special because their main purpose is not really to determine **if** a code path is to be run or not, but rather **how many times** the code path is to be run. But still, some of the looping constructs in PowerShell allow to decide whether or not the code path in the loop is entered at all, based on a condition.

  - `Foreach`statement : No additional code path. The body of the `Foreach` loop may not be entered in the case where the iterated collection is null, but this is an implied behaviour, not a decision  
  - `For` loop : the second placeholder in the `For` statement is a condition which is evaluated to decide whether or not the body of the loop is entered. So it creates 1 additional code path, unless the second placeholder is empty
  - `While` loop : 1 additional path because the body of the loop may not be entered depending on the condition in the `While` statement  
  - `Do/While` or `Do/Until` : No additional code path because the body of these loops is always run at least once.

> How can we apply this to measure the complexity of a PowerShell function ?

We need to parse the function definition to detect the above-mentioned language constructs. To do that, we are going to rely on the **AST-style parser** introduced in PowerShell 3.0.  

Let's see a simple example on how to measure the number of code paths due to `If` statements in the following dummy function :  

```powershell
Function Test-Conditional {

    [CmdletBinding()]
    Param(
        [int]$IfElseif
    )
    # Testing nested If statement
    If ( $IfElseif -gt 20 ) {
        If ( $IfElseif -gt 40 ) {
            Write-Host 'IfElseif is between 20 and 40'
        }
        Else {
            Write-Host 'IfElseif is greater than 40'
        }
    }
    Else {
        If ( $IfElseif -ge 10 ) {
            Write-Host 'IfElseif is a 2 digit number'
        }
        Else {
            #Testing For statements
            For ($i = 1; $i -lt 99; $i++) {
                Write-Host "$($IfElseif + $i)"       
                For ($j = 0; $j -lt 10; $j++) {
                    Write-Host "$($IfElseif - $j)"
                }
            }
            For ($k = 1;;$k++) {
                Write-Host 'No Condition for this loop'
            }
        }
    }
}
```

First, we take the file containing this function and extract the function as a `[FunctionDefinitionAst]` object, like so :  

```powershell
C:\> $File = 'C:\Test-Complexity.ps1'
C:\> $FileAst = [System.Management.Automation.Language.Parser]::ParseFile($File, [ref]$Null, [ref]$Null)
C:\> $FileFunctions = $FileAst.FindAll({ $args[0] -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $False)
C:\> $DummyFunction = $FileFunctions[0]
C:\> $DummyFunction.GetType()

IsPublic IsSerial Name                                     BaseType
-------- -------- ----                                     --------
True     False    FunctionDefinitionAst                    System.Management.Automation.Language.Stat...

C:\> $DummyFunction.Name
Test-Conditional
```

Now that we have our function represented as a `[FunctionDefinitionAST]` object, we can leverage the AST parser to count the `If` statements it contains, using a function like this :  

```powershell
Function Measure-FunctionIfCodePath {

    [CmdletBinding()]
    [OutputType([System.Int32])]
    Param (
        [Parameter(Position=0, Mandatory)]
        [System.Management.Automation.Language.FunctionDefinitionAst]$FunctionDefinition
    )
    
    $FunctionText = $FunctionDefinition.Extent.Text
    # Converting the function definition to a generic ScriptBlockAst because the FindAll method of FunctionDefinitionAst object work strangely
    $FunctionAst = [System.Management.Automation.Language.Parser]::ParseInput($FunctionText, [ref]$null, [ref]$null)
    $IfStatements = $FunctionAst.FindAll({ $args[0] -is [System.Management.Automation.Language.IfStatementAst] }, $True)

    If ( -not($IfStatements) ) {
        return [int]0
    }
    # If and ElseIf clauses are creating an additional path, not Else clauses
    return $IfStatements.Clauses.Count
}
```

To get all the `If` statements, we use the `FindAll` method and we tell it to search for objects of the type `[IfStatementAst]`. No regex needed when we have a proper parsing API !  

The `$True` argument for the `FindAll` method is to include nested objects.
{: .notice--info }  

Also, the `Clauses` property of the `[IfStatementAst]` object represents the `ElseIf` clauses tied to that `If` statement.  
`Else` clauses are considered by AST as a separate statement, I'm not sure why, but this is very convenient for our purpose. We just need to count the number of clauses to get the number of code paths due to `If` and `ElseIf`.

```powershell
C:\> Measure-FunctionIfCodePath -FunctionDefinition $DummyFunction
3   
```

This is correct because our dummy function contains 3 `If` statements with 0 `ElseIf` clause.  

This dummy function contains `For` loops as well, so let's see how to get the number of additional code paths due to `For` loops :  

```powershell
Function Measure-FunctionForCodePath {

    [CmdletBinding()]
    [OutputType([System.Int32])]
    Param (
        [Parameter(Position=0, Mandatory=$True)]
        [System.Management.Automation.Language.FunctionDefinitionAst]$FunctionDefinition
    )
    
    $FunctionText = $FunctionDefinition.Extent.Text
    # Converting the function definition to a generic ScriptBlockAst because the FindAll method of FunctionDefinitionAst object work strangely
    $FunctionAst = [System.Management.Automation.Language.Parser]::ParseInput($FunctionText, [ref]$null, [ref]$null)
    $ForStatements = $FunctionAst.FindAll({ $args[0] -is [System.Management.Automation.Language.ForStatementAst] }, $True)

    # Taking into account the rare cases where For statements don't contain a condition
    $ConditionalForStatements = $ForStatements | Where-Object Condition
    If ( -not($ConditionalForStatements) ) {
        return [int]0
    }
    return $ConditionalForStatements.Count
}
```

We are still using the same `FindAll` method but this time, we tell it to search for `[ForStatementAst]` objects (including nested ones).  

We need to count only the `For` loops where the second placeholder (the condition) is not empty. This is easy to do because this placeholder is represented by AST as the `Condition` property of `[ForStatementAst]` objects. That's why we filter on the `Condition` property.  

What is the result for our dummy function ?  

```powershell
C:\> Measure-FunctionForCodePath $DummyFunction
2
```

This is correct because it counted all the `For` loops, including the nested one, but excluding the one which has no condition.  

Now that we know how to count additional code paths due to `If`, `ElseIf` and `For`, we can use similar techniques for the other PowerShell language constructs mentioned earlier.  
I'm not going to show examples for every one of them here, but you can have a look at the functions [in there](https://github.com/MathieuBuisson/PSCodeHealth/tree/master/PSCodeHealth/Private/Metrics).  

We can aggregate the number of the paths found by all these construct-specific functions in a separate function which takes a `FunctionDefinitionAST` object as input and spits out the total cyclomatic complexity of that function.  
It looks like this :  

```powershell
Function Measure-FunctionComplexity {

    [CmdletBinding()]
    [OutputType([System.Int32])]
    Param (
        [Parameter(Position=0, Mandatory=$True)]
        [System.Management.Automation.Language.FunctionDefinitionAst]$FunctionDefinition
    )
    # Default complexity value for code which contains no branching statement (1 code path)
    [int]$DefaultComplexity = 1

    $ForPaths = Measure-FunctionForCodePath $FunctionDefinition
    $IfPaths = Measure-FunctionIfCodePath $FunctionDefinition
    $LogicalOpPaths = Measure-FunctionLogicalOpCodePath $FunctionDefinition
    $SwitchPaths = Measure-FunctionSwitchCodePath $FunctionDefinition
    $TrapCatchPaths = Measure-FunctionTrapCatchCodePath $FunctionDefinition
    $WhilePaths = Measure-FunctionWhileCodePath $FunctionDefinition
    [int]$TotalComplexity = $DefaultComplexity + $ForPaths + $IfPaths + $LogicalOpPaths + $SwitchPaths + $TrapCatchPaths + $WhilePaths
    return $TotalComplexity
}
```

We start with an initial value of 1 because a piece of code which doesn't contain any logic/branching has exactly 1 code path. And the total cyclomatic complexity of our function is :  

```powershell
C:\> Measure-FunctionComplexity $DummyFunction
6   
```

> That's great, but what is this telling us ?  
> Is our function too complex or not ?  

Well, the purpose of metrics is to help our brain, **not to replace it**.  
Like any metric, we should take this number with a grain of salt and adapt it to our context. That said, the most commonly used thresholds are 10 and 15.  
I have a feeling that higher numbers might be fine for PowerShell code because it tends to be more readable than other languages, but that's very much arguable.  

Besides, this cyclomatic measurement is **only one side of the complexity coin**. To illustrate this, let's look at this piece of code :  

```powershell
$Now = Get-Date
Switch ($Now.Month)
{
    1 { $Month = 'January'; break }
    2 { $Month = 'February'; break }
    3 { $Month = 'March'; break }
    4 { $Month = 'April'; break }
    5 { $Month = 'May'; break }
    6 { $Month = 'June'; break }
    7 { $Month = 'July'; break }
    8 { $Month = 'August'; break }
    9 { $Month = 'September'; break }
    10 { $Month = 'October'; break }
    11 { $Month = 'November'; break }
    12 { $Month = 'December'; break }
}
```

The cyclomatic complexity of this piece of code is 13. So the cyclomatic complexity is pretty high, even though most coders would consider this piece of code as easy to understand and maintain.  

So it can be useful to look at another metric, which measures a different aspect of complexity.  

## Maximum nesting depth :  

> What is the maximum [nesting depth](https://help.semmle.com/wiki/display/CSHARP/Nesting+depth) ?  

It is the depth of the most deeply nested code in a given piece of code (a function, here).  
For example, if we have an `If` statement nested in a loop, which is itself nested in a `Catch` block, the most deeply nested section is the body of the `If` statement and its nesting depth is 3.  

Let's take a new look at our dummy function, but this time **under the nesting depth lens** (it's the same function but I show it here again so you don't have scroll up) :  

```powershell
Function Test-Conditional {

    [CmdletBinding()]
    Param(
        [int]$IfElseif
    )
    # Testing nested If statement
    If ( $IfElseif -gt 20 ) {
        If ( $IfElseif -gt 40 ) {
            Write-Host 'IfElseif is between 20 and 40'
        }
        Else {
            Write-Host 'IfElseif is greater than 40'
        }
    }
    Else {
        If ( $IfElseif -ge 10 ) {
            Write-Host 'IfElseif is a 2 digit number'
        }
        Else {
            #Testing For statements
            For ($i = 1; $i -lt 99; $i++) {
                Write-Host "$($IfElseif + $i)"       
                For ($j = 0; $j -lt 10; $j++) {
                    Write-Host "$($IfElseif - $j)"
                }
            }
            For ($k = 1;;$k++) {
                Write-Host 'No Condition for this loop'
            }
        }
    }
}
```

The code at line 11 is inside an `If` Statement, which is itself in another `If` statement, so its nesting depth is 2.  

The code at line 27 is inside a `For` loop, which is itself in a `For` loop, which is inside an `Else` statement, which is nested in another `Else` statement. So the nesting depth of line 27 is 4, and it is the most deeply nested section in our dummy function.  
So the maximum nesting depth of our function is 4.  

> How does this matter ?  
> What aspect of complexity is this measuring ?  

Well, this line is very simple in itself but, to understand completely what it does and under which condition, we need to understand its context.  

We need to understand the value of `$j` (which changes through the inner loop) and the value of `$i` (which changes through the outer loop). We also need to understand the `If` statement at line 18 and even all the way up to the first `If` because we need to know in which set of conditions this section of code is run.  

So basically, the nesting depth of a piece of code measures **the complexity of its context**.  

Visually, this is easy to follow by looking at the indentation level, but to determine programmatically the nesting depth of a piece of code, we cannot assume that code is always properly indented.  
I could have used a recursive function or built a custom [AstVisitor](https://msdn.microsoft.com/en-us/library/system.management.automation.language.astvisitor(v=vs.85).aspx), but I found these methods too ... complex (pun intended).  

Fortunately, all the logic, control, and looping constructs where nesting occurs in PowerShell have something in common : **curly braces**.  
So we can extract all the curly braces from the code and count them to determine the nesting level, like so :  

```powershell
Function Measure-FunctionMaxNestingDepth {

    [CmdletBinding()]
    [OutputType([Int32])]
    Param (
        [Parameter(Position=0, Mandatory)]
        [System.Management.Automation.Language.FunctionDefinitionAst]$FunctionDefinition
    )
    $FunctionText = $FunctionDefinition.Extent.Text
    $Tokens = $Null
    $Null = [System.Management.Automation.Language.Parser]::ParseInput($FunctionText, [ref]$Tokens, [ref]$Null)

    [System.Collections.ArrayList]$NestingDepthValues = @()
    [Int32]$NestingDepth = 0
    [System.Collections.ArrayList]$CurlyBrackets = $Tokens | Where-Object { $_.Kind -in 'AtCurly','LCurly','RCurly' }

    # Removing the first opening curly and the last closing curly because they belong to the function itself
    $CurlyBrackets.RemoveAt(0)
    $CurlyBrackets.RemoveAt(($CurlyBrackets.Count - 1))
    If ( -not $CurlyBrackets ) {
        return $NestingDepth
    }
    Foreach ( $CurlyBracket in $CurlyBrackets ) {

        If ( $CurlyBracket.Kind -in 'AtCurly','LCurly' ) {
            $NestingDepth++
        }
        ElseIf ( $CurlyBracket.Kind -eq 'RCurly' ) {
            $NestingDepth--
        }
        $NestingDepthValues += $NestingDepth
    }
    Write-Verbose "Number of nesting depth values : $($NestingDepthValues.Count)"
    $MaxDepthValue = ($NestingDepthValues | Measure-Object -Maximum).Maximum -as [Int32]
    return $MaxDepthValue
}
```

First, we parse the text of the function definition into tokens.  

`$NestingDepth` represents the nesting level at any given point in time. Its different values at different points in time are stored in `$NestingDepthValues`.  

Then, we filter the tokens corresponding to curly braces.  
`AtCurly` is a special case, these are the tokens representing opening braces for hashtables. I chose to include the curly braces for hashtables in the nesting calculation because there can be scriptblocks and expressions inside hashtables.  

The core of this function is the `Foreach` loop. It loops through all the curly brace tokens and it increments by 1 the nesting depth if it is an opening curly brace and decrements it by 1 if it is a closing brace.  
Then, the new nesting depth value is added to `$NestingDepthValues`, which keeps track of all the different values of nesting depth.  

When we are done looping through the curly brace tokens, we take all the values in `$NestingDepthValues` and we keep the highest one.  

Let's run that against our dummy function :  

```powershell
C:\> Measure-FunctionMaxNestingDepth $DummyFunction
4    
```

As expected, the maximum nesting depth of the dummy function is 4.  

> Great, but is 4 a good number or a bad number ?  

As you probably guessed, the answer is : *it depends*.  
But there seems to be a consensus, even across different languages ([Java on this page](http://www.codergears.com/xclarify/Metrics#MetricsOnMethods) and [C# here](http://www.ndepend.com/docs/code-metrics#ILNestingDepth) : a nesting depth of 4 or higher is complex, a nesting depth of 8 or higher is extremely complex.  

With these 2 complementary metrics, we have a basis to make decisions on whether or not we should split our code into smaller, simpler functions.  
We can also use these metrics to track our progress when refactoring a PowerShell project, to ensure we are making it more testable and maintainable. **Technical excellence is not a destination, it's a journey**. So how the numbers are changing over time is more important than the numbers themselves.
