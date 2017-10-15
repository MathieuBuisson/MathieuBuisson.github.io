---
title: 'Adding a Quality Gate To a PowerShell Release Pipeline With PSCodeHealth'
tags: [PowerShell, Quality]
excerpt: "In this post, we'll look at PSCodeHealth's default code quality metrics rules and how to customize them to our requirements. Then, we'll use custom metrics rules in a release pipeline to decide if the build should pass or fail."
header:
  teaser: 
---

{%- include toc -%}
In [the previous article]({{- site.url -}}{%- link _posts/2017/2017-10-04-powershell-code-quality-pscodehealth.md -%}), we had brief glances at some of `PSCodeHealth`'s compliance rules for a few code metrics. In this post, we are going to further cover this feature and how it can be leveraged within a release pipeline.  

`PSCodeHealth` collects quite a few metrics to quantify some aspects of code quality and most of these have **compliance rules** associated to them. The purpose of compliance rules is to tell, for a specific metric, how *good* or how *bad* it is.  

## PSCodeHealth's Default Compliance Rules  

First, to view all the compliance rules, we can use the command `Get-PSCodeHealthComplianceRule` without any parameter, like so :  
```powershell
C:\> Get-PSCodeHealthComplianceRule

Metric Name                   Metric Group       Warning        Fail Threshold Higher Is
                                                 Threshold                     Better
-----------                   ------------       -------------- -------------- --------------
LinesOfCode                   PerFunctionMetrics 30             60             False
ScriptAnalyzerFindings        PerFunctionMetrics 7              12             False
TestCoverage                  PerFunctionMetrics 80             70             True
CommandsMissed                PerFunctionMetrics 6              12             False
Complexity                    PerFunctionMetrics 15             30             False
MaximumNestingDepth           PerFunctionMetrics 4              8              False
LinesOfCodeTotal              OverallMetrics     1000           2000           False
LinesOfCodeAverage            OverallMetrics     30             60             False
ScriptAnalyzerFindingsTotal   OverallMetrics     30             60             False
ScriptAnalyzerErrors          OverallMetrics     1              3              False
ScriptAnalyzerWarnings        OverallMetrics     10             20             False
ScriptAnalyzerInformation     OverallMetrics     20             40             False
ScriptAnalyzerFindingsAverage OverallMetrics     7              12             False
NumberOfFailedTests           OverallMetrics     1              3              False
TestsPassRate                 OverallMetrics     99             97             True
TestCoverage                  OverallMetrics     80             70             True
CommandsMissedTotal           OverallMetrics     200            400            False
ComplexityAverage             OverallMetrics     15             30             False
ComplexityHighest             OverallMetrics     30             60             False
NestingDepthAverage           OverallMetrics     4              8              False
NestingDepthHighest           OverallMetrics     8              16             False
```

For example, regarding the **NestingDepthAverage** metric, the lower the value, the better it is.  
The *warning* threshold for this metric is 4, so a value of 4 or lower outputs a "**Pass**" compliance result. The *fail* threshold is 8, so a value between 5 and 8 outputs a "**Warning**" compliance result and a value of 9 or more is a "**Fail**".  

We follow the same principle for the **NestingDepthHighest** metric with 2 differences :  
  - Instead of the average, this is the **highest** value across all functions  
  - The threshold values are the double of those for the average metric  

For more information of each of these metrics and what they attempt to measure, please refer to [this documentation page](http://pscodehealth.readthedocs.io/en/latest/Metrics/).  

As we can see above, there are 2 metrics groups : **OverallMetrics** and **PerFunctionMetrics**. Metrics in the **OverallMetrics** group are values calculated by looking at all the analyzed code, so they always have a single value per `PSCodeHealth` report. As a result, they have a single compliance result per report.  

On the other hand, metrics in the **PerFunctionMetrics** group have a value for every single function in the `PSCodeHealth` report. Therefore, compliance rules associated to these metrics can be used to check the compliance of each individual function.  

We can filter the compliance rules by metric(s) with the `MetricName` parameter, like so :  
```powershell
C:\> Get-PSCodeHealthComplianceRule -MetricName 'LinesOfCode','Complexity','TestCoverage'

Metric Name                   Metric Group       Warning        Fail Threshold Higher Is
                                                 Threshold                     Better
-----------                   ------------       -------------- -------------- -------------
LinesOfCode                   PerFunctionMetrics 30             60             False
TestCoverage                  PerFunctionMetrics 80             70             True
Complexity                    PerFunctionMetrics 15             30             False
TestCoverage                  OverallMetrics     80             70             True
```
  
Note that we got 2 compliance rules for **TestCoverage**. This is because this metric is measured at 2 different levels :  
  - For the entire set of analyzed PowerShell files (**OverallMetrics** group)
  - For each individual function (**PerFunctionMetrics** group)  

There is no need to memorize all the possible values for this `MetricName` parameter, they are discoverable via tab-completion.  

## Checking a PowerShell Project Against PSCodeHealth's Compliance Rules  

Now that we know what `PSCodeHealth` compliance rules are, it's time to run them against some PowerShell code. Just like in the [the previous article]({{- site.url -}}{%- link _posts/2017/2017-10-04-powershell-code-quality-pscodehealth.md -%}), we'll use the code in [PSGithubSearch](https://github.com/MathieuBuisson/PSGithubSearch) as an example.  

The command which does this is `Test-PSCodeHealthCompliance`. It expects an object with the type `[PSCodeHealth.Overall.HealthReport]`, so we create the health report first, and we pass it to `Test-PSCodeHealthCompliance` via its `HealthReport` parameter :  
```powershell
C:\PSGithubSearch> $Params = @{Path='.\PSGithubSearch\'; TestsPath='.\Tests\Unit\'}
C:\PSGithubSearch> $HealthReport = Invoke-PSCodeHealth @Params
C:\PSGithubSearch> Test-PSCodeHealthCompliance -HealthReport $HealthReport

Metric Name                   Warning         Fail Threshold  Value           Result
                              Threshold
-----------                   --------------- --------------  -----           ------
LinesOfCode                   30              60              173             Fail
ScriptAnalyzerFindings        7               12              0               Pass
TestCoverage                  80              70              41.67           Fail
CommandsMissed                6               12              28              Fail
Complexity                    15              30              19              Warning
MaximumNestingDepth           4               8               3               Pass
LinesOfCodeTotal              1000            2000            552             Pass
LinesOfCodeAverage            30              60              110.4           Fail
ScriptAnalyzerFindingsTotal   30              60              0               Pass
ScriptAnalyzerErrors          1               3               0               Pass
ScriptAnalyzerWarnings        10              20              0               Pass
ScriptAnalyzerInformation     20              40              0               Pass
ScriptAnalyzerFindingsAverage 7               12              0               Pass
NumberOfFailedTests           1               3               0               Pass
TestsPassRate                 99              97              100             Pass
TestCoverage                  80              70              77.1            Warning
CommandsMissedTotal           200             400             60              Pass
ComplexityAverage             15              30              11.6            Pass
ComplexityHighest             30              60              19              Pass
NestingDepthAverage           4               8               2.2             Pass
NestingDepthHighest           8               16              3               Pass
```

So we have a few "**Fails**", but we knew that already because we saw red-colored items in [the HTML report]({{ "/assets/html/healthreport.html" | absolute_url }}). Indeed, the items color-coding is based on their compliance result :  
  - Red corresponds to a **Fail** compliance result  
  - Yellow corresponds to a **Warning** compliance result  
  - Green corresponds to a **Pass** compliance result  

You might be wondering why we have 2 instances of **TestCoverage** with different values. Here is the first half of the answer :  
```powershell
C:\PSGithubSearch> Test-PSCodeHealthCompliance -HealthReport $HealthReport -SettingsGroup 'OverallMetrics' -MetricName 'TestCoverage'

Metric Name                   Warning         Fail Threshold  Value           Result
                              Threshold
-----------                   --------------- --------------  -----           ------
TestCoverage                  80              70              77.1            Warning


C:\PSGithubSearch> Test-PSCodeHealthCompliance -HealthReport $HealthReport -SettingsGroup 'PerFunctionMetrics' -MetricName 'TestCoverage'

Metric Name                   Warning         Fail Threshold  Value           Result
                              Threshold
-----------                   --------------- --------------  -----           ------
TestCoverage                  80              70              41.67           Fail
```

The first one is the **overall** test coverage and the second one the test coverage of one of the function in the project. When testing compliance against a metric in the **PerFunctionMetrics** group, the value from the worst function is retained. Here, `41.67` is the value from the function which has the lowest test coverage :  

```powershell
C:\PSGithubSearch> $HealthReport.FunctionHealthRecords |
>> Select-Object -ExpandProperty 'TestCoverage' |
>> Sort-Object
41.67
69.57
79.63
85.42
87.5
```

In case we don't care about the compliance results details for every single metric and we just want a overall compliance result, we can use the `Summary` parameter :  
```powershell
C:\PSGithubSearch> Test-PSCodeHealthCompliance -HealthReport $HealthReport -Summary

Fail
```

The summary result is the worst compliance result across the evaluated compliance rules :  
  - If any evaluated metric has a **Fail** result, the summary result is **Fail**  
  - If any evaluated metric has a **Warning** result and none has **Fail**, the summary result is **Warning**  
  - If all evaluated metrics has a **Pass** result, the summary result is **Pass**  

## Customizing Compliance Rules to Fit Our Requirements  

### How PSCodeHealth's metrics thresholds were set  

You might think `PSCodeHealth` is a very opiniated and rigid tool, with all these rules telling you what is *good* and *bad*, based on thresholds set by the 1 guy who wrote the tool. Who the hell is this guy anyway ?  
I hear you.  

First, I have tried to base compliance rules and metrics thresholds on 3 types of foundations, **in that order** :  
  1. PowerShell community consensus (like in the [Best Practices and Style Guide](https://github.com/PoshCode/PowerShellPracticeAndStyle))  
  2. Practices/thresholds from reference PowerShell projects (like in the [High Quality Module Guidelines](https://github.com/PowerShell/DscResources/blob/master/HighQualityModuleGuidelines.md))  
  3. Metrics thresholds from [other code quality tools](https://www.ndepend.com/docs/code-metrics) (which don't support PowerShell and are generally geared towards Java, C#, Python...)  

The problem is that #1 was often out of the question because many of the metrics collected `PSCodeHealth` have never been measured or even discussed by the PowerShell Community. #2 being extremely rare, I had to resort to #3 most of the time. And this may be *okay* because :  
> Dear PowerShell, you're not **that** special  

It turns out that communities for many different languages have come up with very similar consensuses and metrics thresholds. If something holds true across many different languages, why would there be an exception for PowerShell ?  

That said, these rules, just like the `PSScriptAnalyzer` rules, should be based on input from the PowerShell community. So I invite you to [open issues](https://github.com/MathieuBuisson/PSCodeHealth/issues) so that we can open discussions, form consensuses and improve the tool.  

Second, we can override `PSCodeHealth`'s default metrics thresholds with user-defined ones.  

### Customizing metrics thresholds  

Some PowerShell projects may have different requirements depending on their nature. It may be harder to reach a given test coverage for a project, not because it is poorly coded, but because it is altering external resources (a database for example). In this case, the **Warning** threshold (80%) and the **Fail** threshold (70%) may need to be adjusted.  

The default compliance rules and their thresholds are stored in the file `PSCodeHealthSettings.json` in the module root. To customize them, it is NOT recommended to modify this file, but to create a new JSON file containing the rules we need to override.  

For example, let's say that for `PSGithubSearch`, we decide that we want to override the following metrics thresholds :  
  - OverallMetrics group :  
    - LinesOfCodeAverage :  
      - Warning threshold : 115  
      - Fail threshold : 165  
    - TestCoverage :  
      - Warning threshold : 75  
      - Fail threshold : 65  

We create a new JSON file with the following content :  
```json
{
    "PerFunctionMetrics": [
    ],
    "OverallMetrics": [
        {
            "LinesOfCodeAverage": {
                "WarningThreshold": 115,
                "FailThreshold": 165,
                "HigherIsBetter": false
            }
        },
        {
            "TestCoverage": {
                "WarningThreshold": 75,
                "FailThreshold": 65,
                "HigherIsBetter": true
            }
        }
    ]
}
```

We can name the file however we want and save it wherever we want (the root of the project is a convenient place for use in a release pipeline).  
Any metric **not** specified in this file will use the default rule and thresholds.  

To view the rules in effect (including custom rules), we run `Get-PSCodeHealthComplianceRule` and specify the path of the file containing user-defined rules via the `CustomSettingsPath` parameter :  
```powershell
C:\PSGithubSearch> $Params = @{CustomSettingsPath='.\ProjectRules.json'; SettingsGroup='OverallMetrics'}
C:\PSGithubSearch> Get-PSCodeHealthComplianceRule @Params

Metric Name                   Metric Group       Warning        Fail Threshold Higher Is
                                                 Threshold                     Better
-----------                   ------------       -------------- -------------- --------------
LinesOfCodeTotal              OverallMetrics     1000           2000           False
LinesOfCodeAverage            OverallMetrics     115            165            False
ScriptAnalyzerFindingsTotal   OverallMetrics     30             60             False
ScriptAnalyzerErrors          OverallMetrics     1              3              False
ScriptAnalyzerWarnings        OverallMetrics     10             20             False
ScriptAnalyzerInformation     OverallMetrics     20             40             False
ScriptAnalyzerFindingsAverage OverallMetrics     7              12             False
NumberOfFailedTests           OverallMetrics     1              3              False
TestsPassRate                 OverallMetrics     99             97             True
TestCoverage                  OverallMetrics     75             65             True
CommandsMissedTotal           OverallMetrics     200            400            False
ComplexityAverage             OverallMetrics     15             30             False
ComplexityHighest             OverallMetrics     30             60             False
NestingDepthAverage           OverallMetrics     4              8              False
NestingDepthHighest           OverallMetrics     8              16             False
```

Now, let's check the compliance of our project code against these customized rules. Remember, earlier we got a **Fail** for **LinesOfCodeAverage** and a **Warning** for **TestCoverage** but now with our custom thresholds, they should both pass :  
```powershell
C:\PSGithubSearch> $Params = @{CustomSettingsPath='.\ProjectRules.json';
>> SettingsGroup='OverallMetrics';
>> MetricName='LinesOfCodeAverage','TestCoverage';
>> HealthReport=$HealthReport }
C:\PSGithubSearch> Test-PSCodeHealthCompliance @Params

Metric Name                   Warning         Fail Threshold  Value           Result
                              Threshold
-----------                   --------------- --------------  -----           ------
LinesOfCodeAverage            115             165             110.4           Pass
TestCoverage                  75              65              77.1            Pass
```

We can see that the metrics thresholds are those from our `ProjectRules.json` file and that both metrics get a **Pass**.  

## Using PSCodeHealth As a Quality Gate In a Release Pipeline  
