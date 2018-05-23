---
title: 'Adding PowerShell code quality gates in VSTS using the PSCodeHealth extension'
tags: [PowerShell, DevOps, VSTS]
excerpt: 'In this post, we introduce the PSCodeHealth extension for Visual Studio Team Services. We look at how to use it to assess the quality of PowerShell code and to define and enforce quality gates in VSTS build definitions.'
header:
  teaser: ""
---

{%- include toc -%}

We have already talked about [PSCodeHealth]({{- site.url -}}{%- link _posts/2017/2017-10-04-powershell-code-quality-pscodehealth.md -%}) and how we can really [unleash its usefulness in a release pipeline]({{- site.url -}}{%- link _posts/2017/2017-10-24-pscodehealth-release-pipeline.md -%}).  

So if you care about coding standards and/or quality of your PowerShell code and you use [Visual Studio Team Services](https://www.visualstudio.com/team-services/) to build/release your PowerShell projects, you may be interested in the `PSCodeHealth` extension for VSTS.  

## About the PSCodeHealth VSTS extension  

The extension provides a Build/Release task to gather **PowerShell** code quality metrics. This task also allows to define (and optionally enforce) quality gates based on these code metrics.  

If you already use the `PSCodeHealth` PowerShell module, the VSTS extension doesn't really add anything new in terms of functionality. What it does bring to the table is : **ease of use** and seamless **integration with VSTS**.  


## Adding the extension to your VSTS account  

  * Browse to the [extension page in the Visual Studio marketplace](https://marketplace.visualstudio.com/items?itemName=MathieuBuisson.MB-PSCodeHealth-task)  
  * Click on the "**Get it free**" button  
  * Select your VSTS account  
  * If you are an admin of the VSTS account :  
    * Click "**Install**"  
    * After a few seconds, you should see a message telling that you are all set  
  * If you are not an admin of the VSTS account :  
    * Click "**Request**"  
    * The extension will be added automatically as soon as the request is approved  

Once added to your VSTS account, the `PSCodeHealth` task will be available for :  
  - Build definitions  
  - Release definitions  

## Using the task in a build definition  

To illustrate the usage of the `PSCodeHealth` task, we'll create a brand new build definition for the following GitHub repository : [PSGithubSearch](https://github.com/MathieuBuisson/PSGithubSearch).  

### Creating a new build definition  

* In the "**Builds**" hub, click on "**New**"  
* In the "**Select your repository**" page, select :
  * "**GitHub**" if you have a **GitHub** service endpoint to access the repo  
  * "**VSTS Git**" if you have imported the repo to the VSTS "**Code**" hub using the clone URL  
* Set the default branch to "master"  
* In the "**Choose a template**" page, click on "**Empty process**"  
* In the "**Process**" tab, we'll use `PSGithubSearch-CI` here  
* Choose an Agent queue :  
  * For hosted agents, use "**Hosted VS2017**", because it has PowerShell 5.1 and even `Pester` is pre-installed (albeit an old version)  
  * For private agents, ensure they have PowerShell 5.x. If they don't have `Pester`, you can either install it permanently or use a build task to always get the latest version  
* In the "**Phase 1**" tab, you might want to change the phase display name to something meaningful  

### Adding the PSCodeHealth task to the build definition

* In the "**Phase**" tab, click on the "**Plus**" button  
* Type `PSCodeHealth`  
* Click on "**Add**" to add the task  
* Click on the task name ("**PowerShell Code Analysis**" by default) to get to the task configuration  

### Configuring the task  

#### Specifying the paths of PowerShell code and tests  

The field labeled "**Path to Analyze**" allows you to specify the location of the PowerShell files (.ps1, .psm1 and .psd1) to analyze.  
This is a path relative to the root of the repository. The easy and recommended way of filling out this path is to click the ellipsis button on the right, to browse the files and folders in the repository.  

![Source code and tests paths]({{ "/images/2018-05-24-powershell-code-quality-gate-vsts-code-tests-path.png" | absolute_url }})  

If "**Path to Analyze**" is a folder, which is the case here, the checkbox "**Search PowerShell files in subdirectories**" allows to analyze PowerShell code in subfolders, recursively.  

The field labeled "**Pester Tests Path**" allows to specify the location of the tests, which are going to be executed by `Pester`.  
Again, I would recommended to click the ellipsis button on the right, to browse the files and folders in the repository. In this case, we chose the `Tests/Unit/` subfolder, which contains all the unit tests.  


### Generating an HTML report  

You may opt to generate an HTML report by checking the following checkbox :  

![Generate an HTML Report](images/HtmlReport.png)  

This will enable the field labeled "**HTML report path**" to specify the path and file name of the report.  

#### Selecting specific code metrics  

The quality gate compares actual code metrics of the analyzed PowerShell code with compliance rules for these metrics.  
If 1 or more evaluated code metric(s) doesn't meet its compliance rule, the analyzed code doesn't meet the quality gate.  

By default, the task will evaluate **all** code metrics against their respective compliance rules.  
If you only care about specific metrics, you can specify which ones by checking the box labeled "**Select metrics to evaluate**".  

This will enable additional checkboxes to choose which metrics to evaluate for compliance.  

![Select Code Metrics](images/SelectCodeMetrics.png)  

For details on the code metrics collected by **PSCodeHealth**, please refer to [this documentation page](http://pscodehealth.readthedocs.io/en/latest/Metrics/#metrics-collected-for-the-overall-health-report).  

#### Overriding the default compliance rules  

**PSCodeHealth** comes with default compliance rules which determine, for their respective code metric, whether the analyzed code passes or fails.  

These default rules can be overridden for some (or all) of the code metrics, so you can define the quality gate to suit your requirements or goals.  

The field labeled "**Override compliance rules with a custom settings file**" allows to specify the JSON file where custom compliance rules are defined.  
(click the ellipsis button to look for the file in your repository).  

![Custom Compliance Rules JSON File](images/CustomRules.png)  

For details on compliance rules and how to customize them, please refer to [this documentation page](http://pscodehealth.readthedocs.io/en/latest/HowDoI/CustomizeComplianceRules/).  

#### Enforcing the quality gate  

You can choose how to enforce your quality gate with the field "**Action to take in case of compliance failure(s)**" :  

![Compliance Failure Actions](images/ComplianceFailureAction.png)  

**Possible values and their effect** :  
  - **Silently continue** : no action is taken  
  - **Log warning** : a warning is logged for each failing metric  
  - **Log error and set task result to 'Failed'** :  
    - a warning is logged for each failing metric  
    - an error is logged with the names of metrics failing compliance  
    - the task result is set to 'Failed', which also sets the overall build result to 'Failed'  
