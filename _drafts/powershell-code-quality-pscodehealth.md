---
title: 'Assessing PowerShell code quality and maintainability with PSCodeHealth'
tags: [PowerShell, Quality]
excerpt: "In this article, we are going to start with what we mean by 'code quality' and why it matters. Then, we'll see how PSCodeHealth can help assess the quality and maintainability of a PowerShell project."
---

## What is PowerShell code quality ?  

Code quality is a vast and somewhat subjective notion, so what we cover here is my personal view on code quality **for PowerShell**, which forms the basis for `PSCodeHealth`.  

Instead of engaging in long-winded and abstract discussions about what is quality, we'll focus on tangible attributes which can be observed and reasonably quantified by analyzing the code. This list of attributes is intentionally leaning to where `PSCodeHealth` can help.  

![WTF is quality ?]({{ "/images/powershell-code-quality-pscodehealth-wtf.png" | absolute_url }})  

High-quality PowerShell code tends to have the following characteristics :  

### It follows general best practices, language guidelines and conventions

For PowerShell (as for any language), the community builds consensuses about what are considered *good* practices. For example :  
  - Avoid using aliases in scripts/modules  
  - Avoid hard-coding credentials (especially in plain text) in scripts/modules  
  - Avoid using `Write-Host`  

Of course, there are exceptions to these rules but it is accepted that they should **generally** be followed. These rules exist for a reason, they prevent various gotchas. For example, the 3 rules mentioned above help prevent the following (respectively) :  
  - Aliases tend to be less readable and lesser known than the full command name.    
  - Credentials in plain text can be read by anyone who can read the code and reused for malicious purposes.  
  - There are multiple reasons **not** to use `Write-Host`, [Jeffrey Snover](http://www.jsnover.com/blog/2013/12/07/write-host-considered-harmful/), [Don Jones](http://windowsitpro.com/blog/what-do-not-do-powershell-part-1) and others have explained these reasons so I'm not going to rehash them again here.  

**Conventions are immensely helpful** : they lower the "*barrier to understanding*" for reviewers/contributors and they make developers more productive. The more developers follow them, the more useful they are. So do yourself and the community a favor : use established conventions, unless you have a documented reason not to.  

To evaluate whether a piece of code follows sound practices and general language guidelines, this is where linting tools come in. In the PowerShell realm, we have [PSScriptanalyzer](https://github.com/PowerShell/PSScriptAnalyzer).  

### It follows a consistent style  

There are other practices which are more a matter of personal (or team) preference, like :  
  - Indentation  
  - Opening braces on the same line or a new line  
  - Capitalization
  - Naming conventions (especially for variables)  

The main rule for these type of practices is more akin to :  
> Pick a style and stick to it.  

What matters here is **consistency** across a given file, module, project or team.  
Consistency improves readability because anyone reviewing the code can train one's eye to a given style aspects and use that to read the code more quickly.  

On the contrary, every time the consistency is broken (for example, an opening brace on a new line as opposed to the same line for the rest of the file), the reader is slowed down and/or confused.  

When working as part of a team, style consistency reduces the number of *not-so-obvious* and *not-so-useful* changes in source control, for example, commits consisting only in :  
  - Changing a tab into 4 spaces  
  - Adding or removing whitespace  
  - Changing a pair of double quotes into single quotes  

You don't want these silly little things to delay the merging of your pull requests, do you ?  

Again, a linting tool, possibly with the addition of custom rules to match a specific style guide, can help greatly in this regards.  

### Single-purpose, short simple functions  

#### Single-purpose  

A function should do 1 thing and do it well.  
This makes the code modular and understandable, because it organizes it into logical, single-responsibility chunks. A function is basically a named code block and to contribute to this organization of the code, the name of a function should tell its purpose.  

Functions should generally follow PowerShell cmdlets `Verb-Noun` naming convention and this helps keep them single-purpose. If multiple verbs could be used for a function name, this function is doing more than 1 type of operations and it should be split up. If we need an "And" or many words to compose a descriptive noun for a function, the function is most likely doing too many things.  

#### Short  

The most obvious argument goes back to readability.  

There is another argument in favor of short functions : it forces the developer to extract a lot of code into other functions, which are logically scoped, tightly focused and ... short. Also, a function containing many calls to other functions with intent-revealing names can read like a narrative. We all love a good story, right ?  

#### Simple  

> What is a simple function ?  
> What is a complex function ?  
> Why does it matter ?  

Well, I already wrote a [detailed PowerShell-specific answer to these questions]({{- site.url -}}{%- link _posts/2017/2017-04-18-measuring-powershell-code-complexity.md -%}), so I invite you to take a look at it.  

### Documented  

There is a reason I use the term "*documented*" and not "*commented*". Too much inline comments can clutter the code and can actually make it less readable.  
Inline comments should :  
  - Be used only when necessary  
  - Not state the obvious  
  - Used to explain the logic, not the syntax  
  - Not be needed if the code is clear, idiomatic and uses intent-revealing names  

A descriptive name is better than a comment.  
On the other hand, there is a place where comments belong : **comment-based help**.  
Public functions should contains comment-based to provide the user a quick access to documentation (via `Get-Help`). Arguably, even private functions should be documented this way, for code reviewers/contributors.  

Besides, comment-based help can be turned into documentation using a tool like [platyPS](https://github.com/PowerShell/platyPS), inline comments cannot.

### Testable and tested  

Again, we are opening a Pandora's box because testing is a huge topic and has diverse, far-reaching implications. In the context of PowerShell, testing is pretty much synonymous with [Pester](https://github.com/pester/Pester), so that's what we focus on here.  

#### Tested  

To summarize, effective tests provide :  
  - Proof that the code works as intended/expected  
  - **Early** detection of code defects (the later a defect is detected, the harder it is to fix)  
  - Fast feedback on whether code changes are breaking existing functionality  
  - Potentially, executable specifications  

There many other benefits, but essentially, they boil down to **less code defects** and **more confidence**.  

Any contributor making code changes can run the tests to know immediately if the changes are breaking existing functionality or not. This makes changing the code easier and safer, it gives developers **confidence** and it is very beneficial to the overall maintainability.  

#### Testable  

PowerShell functions which are easy to test (particularly **unit** test) have the following attributes :  
  - Short  
  - Simple  
  - Tightly focused (they have a single, well-scoped responsibility)  
  - Loosely coupled to their dependencies  

Does this ring a bell ? It should, because : these attributes are also **attributes of high quality code**.  

This is why thinking about the tests during code design (or before, for those into <abbr title="Test-driven development">TDD</abbr>) tends to lead to higher quality code.  

Now that we are on the same page regarding the characteristics which make up PowerShell code quality and maintainability, let's look at how `PSCodeHealth` can help us measure these characteristics.  

## Generating a PSCodeHealth report for a PowerShell project  

[PSGithubSearch](https://github.com/MathieuBuisson/PSGithubSearch) is a cute little PowerShell module I have written a while back, but I'm concerned that its quality and maintainability may not be up to par.  

Let's start by creating a `PSCodeHealth` report for all the PowerShell files (`'*.ps*1'`) in the project and store it into a variable for later use :  

```powershell
C:\PSGithubSearch> $Params = @{Path='.\PSGithubSearch\'; TestsPath='.\Tests\Unit\'; Recurse=$True}
C:\PSGithubSearch> $HealthReport = Invoke-PSCodeHealth @Params
C:\PSGithubSearch> $HealthReport

Files    Functions        LOC (Average)    Findings (Total) Findings         Complexity       Test Coverage
                                                            (Average)        (Average)
-----    ---------        -------------    ---------------- ---------------- ---------------- -------------
2        5                128.2            0                0                15.2             71.29 %
```

The default formatting view provides basic information for the overall project, but there is more :  

```powershell
C:\PSGithubSearch> $HealthReport | Select-Object -Property '*' -Exclude 'FunctionHealthRecords'


ReportTitle                   : PSGithubSearch
ReportDate                    : 2017-09-29 13:23:30Z
AnalyzedPath                  : C:\PSGithubSearch\PSGithubSearch\
Files                         : 2
Functions                     : 5
LinesOfCodeTotal              : 641
LinesOfCodeAverage            : 128.2
ScriptAnalyzerFindingsTotal   : 1
ScriptAnalyzerErrors          : 0
ScriptAnalyzerWarnings        : 1
ScriptAnalyzerInformation     : 0
ScriptAnalyzerFindingsAverage : 0.2
FunctionsWithoutHelp          : 0
NumberOfTests                 : 27
NumberOfFailedTests           : 0
FailedTestsDetails            :
NumberOfPassedTests           : 27
TestsPassRate                 : 100
TestCoverage                  : 71.29
CommandsMissedTotal           : 89
ComplexityAverage             : 15.2
ComplexityHighest             : 30
NestingDepthAverage           : 2.4
NestingDepthHighest           : 3
```

For more information on these metrics and which aspect(s) of quality/maintainability they attempt to quantify, please refer to [this documentation page](http://pscodehealth.readthedocs.io/en/latest/Metrics/).  

This raw data is nice but a visual, dashboard-like HTML report would probably be a better starting point to understand where this project is doing well and where it needs improvement. We can do that using the `HtmlReportPath` parameter :  

```powershell
C:\PSGithubSearch> Invoke-PSCodeHealth @Params -HtmlReportPath 'C:\HealthReport.html'
```

Here is what the **Summary** tab of the report looks like :  

![HTML report - Summary tab]({{ "/images/powershell-code-quality-pscodehealth-summary.png" | absolute_url }})  

The **Summary** tab is just an overview, the sidebar provides access to more specific sections of the report :  

![HTML report - Sidebar](https://raw.githubusercontent.com/MathieuBuisson/PSCodeHealth/master/Examples/SidebarScreenshot.png)  

To see it in action, you can play with [a live version of this report]({{ "/assets/html/healthreport.html" | absolute_url }}).  

## Interpreting PSCodeHealth's HTML report  

The report's color-coding is straightforward : green means good, yellow means warning and red means danger.  
It is designed to provide at-a-glance information about which area(s)/aspect(s) of the code need attention or improvement.  

### Style & Best Practices tab  

The section of the report focuses on `PSScriptAnalyzer` findings and comment-based help.  
There is only 1 finding in the whole project so this is fine.  

### Maintainability tab  

#### Functions length  

The average number of lines of code per function (128.2) shows up in red, so it must be bad.  
How bad ? The compliance rule for this metric gives us a good idea :  

```powershell
C:\PSGithubSearch> Get-PSCodeHealthComplianceRule -MetricName 'LinesOfCodeAverage'

Metric Name                   Metric Group       Warning          Fail Threshold  Higher Is
                                                 Threshold                        Better
-----------                   ------------       ---------------- --------------  ---------------
LinesOfCodeAverage            OverallMetrics     30               60              False
```

So this means that this metric starts to show up in yellow from 30 (lines of code per function) and in red from 60. So here, this metric is over twice the "*danger*" threshold ! This needs improvement, a lot of it.  

Also, the *per function information* table tells us which particular function(s) we should focus on to improve the project's overall maintainability. 
We can see that the most serious offender is `Find-GitHubIssue` with **219 lines of code**. Ouch !  

#### Complexity  

We can see that the maximum cyclomatic complexity is green, which is good, but the average is yellow. Why ?  

```powershell
C:\PSGithubSearch> Get-PSCodeHealthComplianceRule -MetricName 'ComplexityHighest','ComplexityAverage'

Metric Name                   Metric Group       Warning          Fail Threshold  Higher Is
                                                 Threshold                        Better
-----------                   ------------       ---------------- --------------  ---------------
ComplexityHighest             OverallMetrics     30               60              False
ComplexityAverage             OverallMetrics     15               30              False
```

At 15.2, the average complexity is slightly above the *warning* threshold, but still, this is worth looking into. Once again, the *per function information* table points at `Find-GitHubIssue` as the main offender, so we definitely need to take a hard look at this function.  

#### Nesting depth  

Regarding nesting depth, all functions in the project are green, so we are good.  

### Tests tab  

#### Tests failures  

All 27 unit tests in this project have passed, so let's move along, there's nothing to see here.  

#### Tests code coverage  

These tests exercise 71.29 % of the project's code. The panel containing the overall "*Test Coverage*" chart is yellow which means this metric is at *warning* level. For more information, we can look at what the compliance rule for this metric has to say about that :  

```powershell
C:\PSGithubSearch> Get-PSCodeHealthComplianceRule -MetricName 'TestCoverage' -SettingsGroup 'OverallMetrics'

Metric Name                   Metric Group       Warning          Fail Threshold  Higher Is
                                                 Threshold                        Better
-----------                   ------------       ---------------- --------------  ---------------
TestCoverage                  OverallMetrics     80               70              True
```

This yellow is actually dark orangish because the tests code coverage is very close to the *danger* zone.  

Coverage can vary widely from 1 function to another so it is probably a good idea to look at the *Per Function Information* table to see if there are low-hanging fruits (functions for which we could easily and significantly increase the test coverage).  

`Get-NumberOfPage` has only 41 % of its code exercised by unit tests. This is low, but I'm not too worried about it because it is just a private helper function and it is short and simple.  
`Find-GitHubIssue` on the other hand is one of the 4 public functions in the module. 65 % test coverage is fairly low, but does this mean it is a low-hanging fruit ? Not necessarily because, as we have seen above, this function is huge and has a high cyclomatic complexity. Cyclomatic complexity has a strong **inverse** correlation with testability, because it tells the number of code paths that the tests need to covered.  

#### Missed commands  



For more information, I highly recommend reading **[Clean Code: A Handbook of Agile Software Craftsmanship](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)**. This is a fascinating deep dive into code quality fundamentals and probably the definitive reference on the subject.