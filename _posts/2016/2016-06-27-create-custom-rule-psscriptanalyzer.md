---
title: How to create a custom rule for PSScriptAnalyzer
tags:
  - DevOps
  - PowerShell
---

As you probably know, [PSScriptAnalyzer](https://github.com/PowerShell/PSScriptAnalyzer) is a static code analysis tool, which checks PowerShell code against rules representing best practices and style guidelines.  
This is a fantastic tool to set coding style and quality standards, and if we want to, we can easily [enforce these standards within a build pipeline]({% post_url 2016/2016-05-19-psscriptanalyzer-appveyor %}) .

The PowerShell community was very much involved in the definition of **PSScriptAnalyzer** rules, so these rules make sense as general guidelines and they are widely accepted by the community. However, a given project might have different or more specific coding standards.  
Or maybe, you feel like [Richard Hendricks regarding Tabs vs Spaces](https://www.youtube.com/watch?v=SsoOG6ZeyUI).

Fortunately, `PSScriptAnalyzer` allows us to create and use custom rules. In this article, we are going to learn how to do that with a simple example.  
Let's say we have coding standards which specifies that all variables names should follow a consistent [capitalization style](https://msdn.microsoft.com/en-ie/library/x2dbyw72(v=vs.71).aspx), in particular : PascalCasing. So we are going to write a `PSScriptAnalyzer` rule to check our code against that convention in the form of a function.

To write this function, our starting point should be [this documentation page](https://github.com/PowerShell/PSScriptAnalyzer/blob/development/ScriptRuleDocumentation.md).  

First, how are we going to name our function ? If we look at [the CommunityAnalyzerRules module](https://github.com/PowerShell/PSScriptAnalyzer/blob/development/Tests/Engine/CommunityAnalyzerRules/CommunityAnalyzerRules.psm1), we see that the functions names use the verb `Measure`.  

It seems like a sensible convention to follow. That way, if we have multiple rules stored in a single file, we can export all of of them like so :

```powershell
Export-ModuleMember -Function Measure-*
```

So, given our rule is about PascalCasing, the function name `Measure-PascalCase` makes sense.

Next, we need an appropriate comment-based help for our function, like this :

```powershell
Function Measure-PascalCase {
<#
.SYNOPSIS
    The variables names should be in PascalCase.

.DESCRIPTION
    Variable names should use a consistent capitalization style, i.e. : PascalCase.
    In PascalCase, only the first letter is capitalized. Or, if the variable name is made of multiple concatenated words, only the first letter of each concatenated word is capitalized.
    To fix a violation of this rule, please consider using PascalCase for variable names.

.EXAMPLE
    Measure-PascalCase -ScriptBlockAst $ScriptBlockAst

.INPUTS
    [System.Management.Automation.Language.ScriptBlockAst]

.OUTPUTS
    [Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord[]]

.NOTES
    https://msdn.microsoft.com/en-us/library/dd878270(v=vs.85).aspx
    https://msdn.microsoft.com/en-us/library/ms229043(v=vs.110).aspx
#>
```

The `DESCRIPTION` part of the help is actually used by `PSScriptAnalyzer` so it is important. It should contain an explanation of the rule, as well as a brief explanation of how to remediate any violation of the rule.  
Here, we don't want to assume that all users know what PascalCase means, so we give a succinct but (hopefully) clear definition of PascalCase.

In the `INPUTS` field, we tell the user that the only parameter for our function takes an object of the type : `[System.Management.Automation.Language.ScriptBlockAst]`, but it could be other <abbr title="Abstract Syntax Tree">AST</abbr> types.  

> But wait, what is AST ?  

The short(ish) version is that PowerShell 3.0 introduced a new parser and that Parser relies on <abbr title="Abstract Syntax Tree">AST</abbr> to expose various elements of the PowerShell language as objects.  
This facilitates parsing PowerShell code and extract objects corresponding to language elements like : variables, function definitions, parameters, control flow keywords, etc...  
`PSScriptAnalyzer` relies heavily on this AST-based parser.

In the `OUTPUTS` field, we tell that the function will return one or more objects of the type `[Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord]`. This is a contract between our function and `PSScriptAnalyzer`.  
This is more formally declared with the following function attribute :

```powershell
[OutputType([Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord[]])]
```

But even with this declaration, PowerShell doesn't enforce that. So it's **our** responsibility to ensure our code doesn't return anything else.  
Otherwise, `PSScriptAnalyzer` will not be happy.

Now it is time to tackle the code inside our function. Looking at [the CommunityAnalyzerRules module](https://github.com/PowerShell/PSScriptAnalyzer/blob/development/Tests/Engine/CommunityAnalyzerRules/CommunityAnalyzerRules.psm1), most functions have the same basic structure :

```powershell
#region Define predicates to find ASTs.
[ScriptBlock]$Predicate = {
    Param ([System.Management.Automation.Language.Ast]$Ast)

    [bool]$ReturnValue = $False
    If ( ... ) {
        ...
    }
    return $ReturnValue
}
#endregion
#region Find ASTs that match the predicates.
[System.Management.Automation.Language.Ast[]]$Violations = $ScriptBlockAst.FindAll($Predicate, $True)

If ($Violations.Count -ne 0) {
    Foreach ($Violation in $Violations) {
        $Result = New-Object `
                -Typename 'Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord' `
                -ArgumentList  ...
          
        $Results += $Result
    }
}
return $Results
#endregion
```

We don't have to follow that structure but it is a very helpful scaffolding.  
As we can see above, the function is divided in 2 logical parts:  
  - definition of one or more predicates corresponding to our rule  
  - usage of the predicate(s) against input (PowerShell code)

## Defining predicates  

> What is a predicate ?  

It is a scriptblock which returns `$True` or `$False` and it is used to filter objects.  
We keep the objects for which the predicate returns `$True` and we filter out the objects for which it returns `$False`.  
Sounds complicated ? It's not, and you are using predicates. **All. The. Time** :  
```powershell
C:\> $ThisIsAPredicate = { $_.Name -like '*.ps*1' }
C:\> Get-ChildItem -Recurse | Where-Object $ThisIsAPredicate
```

In the context of our `PSScriptAnalyzer` rule function, the predicate is used to identify violations of our rule. Any piece of PowerShell code which returns `$True` when fed to our predicate has a violation.  

We can use multiple methods to detect violations, so we can define multiple predicates if we need/want to. Here, this is a simple example so we are going to define a single predicate.

Our predicate should take input (pieces of PowerShell code) via a parameter. Here, the parameter is `Ast` and it takes objects of the type `[System.Management.Automation.Language.Ast]`. This is the generic class for <abbr title="Abstract Syntax Tree">AST</abbr>, this allows the parameter to accept objects of child classes.

```powershell
            [ScriptBlock]$Predicate = {
                Param ([System.Management.Automation.Language.Ast]$Ast)
                ...
```

Our rule for PascalCasing relates only to variable names, so we first need to identify variables. What is most relevant for naming is when variables are defined, or assigned a value, not really when they are referenced. So the arguably best way to identify variables for our particular purpose is to identify variable assignments, like so :

[powershell gutter="true"]
If ($Ast -is [System.Management.Automation.Language.AssignmentStatementAst]) {

    ...
[/powershell]
&nbsp;
Next, we need to identify any variable names which don't follow PascalCasing. For that, we'll use the comparison operator **<code>-cnotmatch</code>** and a regex. As you probably know, PowerShell is not case sensitive. But our rule is all about casing, **it is case hypersensitive**. This makes the "c" in **<code>-cnotmatch</code>** crucial for our predicate to work :

[powershell gutter="true"]
[System.Management.Automation.Language.AssignmentStatementAst]$VariableAst = $Ast
    If ($VariableAst.Left.VariablePath.UserPath -cnotmatch '^([A-Z][a-z]+)+$') {
        $ReturnValue = $True
    }
[/powershell]
&nbsp;
To extract only the variable names from our variable assignment objects, we take their "**Left**" property (what's on the left side of the assignment operator), then the "**VariablePath**" property and then the "**UserPath**" nested property. This gives us only the variable name as a [string]. If that string doesn't match our regular expression, the predicate returns **$True**, which means there is a violation.

A brief explanation of the regex used above **<code>([A-Z][a-z]+) </code>**:
this means one upper case letter followed by one or more lower case letter(s). This particular pattern can be repeated so we put it between parenthesis and append a "+". And all this should strictly between the beginning of the string "^" and the end of the string "$".

Off course, this detection method is limited because there is no intelligence to detect words of the English language (or any language) which may be concatenated to form the variable name :

[powershell gutter="true"]
PS C:\> 'FirstwordSecondword' -cmatch '^([A-Z][a-z]+)+$'
True

PS C:\> 'FirstwoRdsecoNdword' -cmatch '^([A-Z][a-z]+)+$'
True
[/powershell]
&nbsp;
Also, I'm not a big fan of using digits in variable names but if you want the rule to allow that, you can use the following regex :

[powershell gutter="true"]
PS C:\> 'Word1Word2' -cmatch '^([A-Z]\w+)+$'
True
[/powershell]
&nbsp;
<h2>Using the predicate to detect violations</h2>

Now, we can use our predicate against whatever PowerShell code is fed to our **Measure-PascalCase** function via its **$ScriptBlockAst** parameter. The input PowerShell code is an object of the type **<code>[System.Management.Automation.Language.ScriptBlockAst]</code>**, so like most AST objects, it has a **FindAll()** method which we can use to find all the elements within that object which match a predicate.

[powershell]
[System.Management.Automation.Language.Ast[]]$Violations = $ScriptBlockAst.FindAll($Predicate, $True)
[/powershell]
&nbsp;
The second parameter of the **FindAll()** method ($True) tells it to search recursively in nested elements.

Now, for any violation of our rule, we need to create an object of the type **<code>[Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord]</code>**, because `PSScriptAnalyzer` expects our function to return an array of object(s) of that specific type :

[powershell gutter="true"]
Foreach ($Violation in $Violations) {

    $Result = New-Object `
            -Typename 'Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord' `
            -ArgumentList '$((Get-Help $MyInvocation.MyCommand.Name).Description.Text)',$Violation.Extent,$PSCmdlet.MyInvocation.InvocationName,Information,$Null
          
    $Results += $Result
}
[/powershell]
&nbsp;
Pay particular attention to the 5 values passed to the **-ArgumentList** parameter of the cmdlet **<code>New-Object</code>**. To see what each of these values correspond to, we can have a look at the constructor(s) for this class :

[powershell gutter="true"]
C:\> [Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord]::new

OverloadDefinitions
-------------------
Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord new()
Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticRecord new(string message,
System.Management.Automation.Language.IScriptExtent extent, string ruleName,
Microsoft.Windows.PowerShell.ScriptAnalyzer.Generic.DiagnosticSeverity severity, string scriptName, string ruleId)
[/powershell]
&nbsp;
For the "**Message**" property of our **<code>[DiagnosticRecord]</code>** objects, hard-coding a relatively long message would not look nice, so here, we are reusing our carefully crafted description from the comment-based help. We don't have to do this, but that way, we don't reinvent the wheel. 

Then, each resulting object is added to an array : **$Results**.
Finally, when we are done processing violations, we return that array for `PSScriptAnalyzer`'s consumption :

[powershell gutter="true"]
            }
            return $Results
            #endregion
        }
[/powershell]
&nbsp;
That's it. The module containing the full function is on <a href="https://github.com/MathieuBuisson/PowerShell-DevOps/blob/master/CustomPSScriptAnalyzerRules/MBAnalyzerRules.psm1">this GitHub page</a>.

Now, let's use our custom rule with `PSScriptAnalyzer` against an example script :

[powershell gutter="true"]
C:\> Invoke-ScriptAnalyzer -Path .\ExampleScript.ps1 -CustomRulePath .\MBAnalyzerRules.psm1 |
 Select-Object RuleName, Line, Message | Format-Table -AutoSize -Wrap

RuleName                           Line Message
--------                           ---- -------
MBAnalyzerRules\Measure-PascalCase   15 Variable names should use a consistent capitalization style, i.e. : PascalCase.
                                        In PascalCase, only the first letter is capitalized. Or, if the variable name
                                        is made of multiple concatenated words, only the first letter of each
                                        concatenated word is capitalized.
                                        To fix a violation of this rule, please consider using PascalCase for variable
                                        names.
MBAnalyzerRules\Measure-PascalCase   28 Variable names should use a consistent capitalization style, i.e. : PascalCase.
                                        In PascalCase, only the first letter is capitalized. Or, if the variable name
                                        is made of multiple concatenated words, only the first letter of each
                                        concatenated word is capitalized.
                                        To fix a violation of this rule, please consider using PascalCase for variable
                                        names.
MBAnalyzerRules\Measure-PascalCase   86 Variable names should use a consistent capitalization style, i.e. : PascalCase.
                                        In PascalCase, only the first letter is capitalized. Or, if the variable name
                                        is made of multiple concatenated words, only the first letter of each
                                        concatenated word is capitalized.
                                        To fix a violation of this rule, please consider using PascalCase for variable
                                        names.
MBAnalyzerRules\Measure-PascalCase   88 Variable names should use a consistent capitalization style, i.e. : PascalCase.
                                        In PascalCase, only the first letter is capitalized. Or, if the variable name
                                        is made of multiple concatenated words, only the first letter of each
                                        concatenated word is capitalized.
                                        To fix a violation of this rule, please consider using PascalCase for variable
                                        names.
[/powershell]
&nbsp;
That's cool, but we probably want to see the actual variable names which are not following our desired capitalization style. We can obtain this information like so :

<a href="http://theshellnut.com/wp-content/uploads/2016/06/VariableNames2.png"><img src="http://theshellnut.com/wp-content/uploads/2016/06/VariableNames2.png" alt="VariableNames" width="984" height="154" class="alignnone size-full wp-image-705" /></a>
&nbsp;
We can see that in the case of this script (pun intended), the case of variable names is all over the place, and we can easily go and fix it.