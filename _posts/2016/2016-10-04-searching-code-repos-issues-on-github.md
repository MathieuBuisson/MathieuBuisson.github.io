---
title: Searching code, repos, issues, pull requests and users on GitHub using PowerShell
tags:
  - GitHub
  - PowerShell
---

Coding, especially in PowerShell, is not about remembering the exact syntax of how to do something, it is more about knowing how to try things out and to get the information we need to do whatever we need to accomplish.  

Quite often, even though we don't remember the exact syntax, we know the thing we want to do is something we've already done.  
So there is a good chance it's already in the code base we have on [GitHub](https://github.com/).
If only we could use GitHub as an extension of our brain directly from our PowerShell console...  

This is where [PSGithubSearch](https://github.com/MathieuBuisson/PSGithubSearch) comes in.  
It uses the GitHub Search API to retrieve the following items :  
  - Code  
  - Repositories  
  - Issues  
  - Pull requests  
  - Users  
  - Organisations  

Let's have a look at a few examples to illustrate how we can use its 4 cmdlets.

## Find-GitHubCode :  

Maybe you are working on a new PowerShell function which could really use a `Confirm` parameter, let's say `Invoke-NuclearRedButton`.  
You know that this requires the `SupportsShouldProcess` cmdletBinding attribute but you never *ever* remember exactly how to use it inside the function.  
You could run the following :

```powershell
C:\> Find-GitHubCode -Keywords 'SupportsShouldProcess' -User $Me -Language 'PowerShell' |
>> Select-Object -First 1

FileName               : Update-ChocolateyPackage.psm1
FilePath               : Update-ChocolateyPackage/Update-ChocolateyPackage.psm1
File Url               : https://github.com/MathieuBuisson/Powershell-Utility/blob/5dde8e9bb4fa6244953fee4042e2100acfc6
                         ad72/Update-ChocolateyPackage/Update-ChocolateyPackage.psm1
File Details Url       : https://api.github.com/repositories/28262426/contents/Update-ChocolateyPackage/Update-Chocolat
                         eyPackage.psm1?ref=5dde8e9bb4fa6244953fee4042e2100acfc6ad72
Repository Name        : MathieuBuisson/Powershell-Utility
Repository Description : Various generic tools (scripts or modules) which can be reused from other scripts or modules
Repository Url         : https://github.com/MathieuBuisson/Powershell-Utility
```


OK, but you might want to see the actual file content with the code.  
This is not built into the cmdlet because it requires an additional API call and the GitHub search API limits the number of unauthenticated requests to 10 per minute.  
So I limit as much as possible the number of API requests.  

Anyway, here is how to get the actual code snippet :  

```powershell
C:\> $FileUrl = (Find-GitHubCode -Keywords 'SupportsShouldProcess' -User $Me -Language 'PowerShell')[0].url
C:\> $Base64FileContent = (Invoke-RestMethod -Uri $FileUrl).Content
C:\> [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Base64FileContent)) -split '\n' |
>> Where-Object { $_ -match 'ShouldProcess' }

    [CmdletBinding(SupportsShouldProcess)]
                If ($PSCmdlet.ShouldProcess($($CurrentPackage.Name), "Install-Package")) {
```

The original result gives us a `url` we can query to get more information on that file.  
This additional query gives us the content of the file but as a Base64 encoded string, that's why we need to decode it as UTF8.  
At this point, it is a single string, that's why we needed to split it on each new line character `\n`.

This is not very practical for large files, so you can restrict the search to files of a certain size (in bytes), like so :

```powershell
C:\> Find-GitHubCode -Repo "$Me/Powershell-Utility" -Keywords 'SupportsShouldProcess' -SizeBytes '<4000'

FileName               : Update-ChocolateyPackage.psm1
FilePath               : Update-ChocolateyPackage/Update-ChocolateyPackage.psm1
File Url               : https://github.com/MathieuBuisson/Powershell-Utility/blob/5dde8e9bb4fa6244953fee4042e2100acfc6
                         ad72/Update-ChocolateyPackage/Update-ChocolateyPackage.psm1
File Details Url       : https://api.github.com/repositories/28262426/contents/Update-ChocolateyPackage/Update-Chocolat
                         eyPackage.psm1?ref=5dde8e9bb4fa6244953fee4042e2100acfc6ad72
Repository Name        : MathieuBuisson/Powershell-Utility
Repository Description : Various generic tools (scripts or modules) which can be reused from other scripts or modules
Repository Url         : https://github.com/MathieuBuisson/Powershell-Utility
```

There are other parameters which can help narrow down the search. We'll leave that as homework, because we have 3 other cmdlets to cover.

## Find-GitHubRepository :  

As an example, we might want to know what interesting project one of our favorite automation expert is currently working on :

```powershell
C:\> $WarrenRepos = Find-GitHubRepository -Keywords 'PowerShell' -User 'RamblingCookieMonster'
C:\> $WarrenRepos | Sort-Object -Property 'pushed_at' -Descending | Select-Object -First 1

Name         : PSDepend
Full Name    : RamblingCookieMonster/PSDepend
Owner        : RamblingCookieMonster
Url          : https://github.com/RamblingCookieMonster/PSDepend
Description  : PowerShell Dependency Handler
Fork         : False
Last Updated : 2016-08-28T15:48:52Z
Last Pushed  : 2016-09-29T16:06:04Z
Clone Url    : https://github.com/RamblingCookieMonster/PSDepend.git
Size (KB)    : 202
Stars        : 10
Language     : PowerShell
Forks        : 2
```

Warren has been working on this new project for a good month, and this project already has 10 stars and 2 forks. It definitely looks like an interesting project.

We can also sort the results by popularity (number of stars) or by activity (number of forks).  
For example, we could get the most popular PowerShell projects related to deployment, like so :

```powershell
C:\> $DeploymentProjects = Find-GitHubRepository -Keywords 'Deployment' -In description -Language 'PowerShell' -SortBy stars
C:\> $DeploymentProjects | Select-Object -First 2

Name         : AzureStack-QuickStart-Templates
Full Name    : Azure/AzureStack-QuickStart-Templates
Owner        : Azure
Url          : https://github.com/Azure/AzureStack-QuickStart-Templates
Description  : Quick start ARM templates that deploy on Microsoft Azure Stack
Fork         : False
Last Updated : 2016-10-01T19:16:20Z
Last Pushed  : 2016-09-28T22:03:44Z
Clone Url    : https://github.com/Azure/AzureStack-QuickStart-Templates.git
Size (KB)    : 11617
Stars        : 118
Language     : PowerShell
Forks        : 74

Name         : unfold
Full Name    : thomasvm/unfold
Owner        : thomasvm
Url          : https://github.com/thomasvm/unfold
Description  : Powershell-based deployment solution for .net web applications
Fork         : False
Last Updated : 2016-09-25T03:55:03Z
Last Pushed  : 2014-10-10T07:28:22Z
Clone Url    : https://github.com/thomasvm/unfold.git
Size (KB)    : 1023
Stars        : 107
Language     : PowerShell
Forks        : 13
```

We used the `In` parameter to look for the "Deployment" keyword in the **description** field of repositories.  
If we wanted to, we could look in the **Name** field or the **ReadMe** field instead.  

Now let's dive into the heart of GitHub collaboration with issues and pull requests.

## Find-GitHubIssue :  

Maybe, we want to know the most commented open issue on the PowerShell project which hasn't been assigned to anyone yet.  
This is fairly easy to do :

```powershell
C:\> Find-GitHubIssue -Repo 'PowerShell/PowerShell' -Type issue -State open -No assignee -SortBy comments |
>> Select-Object -First 1

Title        : Parameter binding problem with ValueFromRemainingArguments in PS functions
Number       : 2035
Id           : 172737066
Url          : https://github.com/PowerShell/PowerShell/issues/2035
Opened by    : dlwyatt
Labels       : {Area-Language, Issue-Bug, Issue-Discussion}
State        : open
Assignees    :
Comments     :
Created      : 2016-08-23T15:51:55Z
Last Updated : 2016-09-29T14:45:43Z
Closed       :
Body         : Steps to reproduce
               ------------------

               Define a PowerShell function with an array parameter using the ValueFromRemainingArguments property of
               the Parameter attribute.  Instead of sending multiple arguments, send that parameter a single array
               argument.

                & {
                    param(
                        [string]
                        [Parameter(Position=0)]
                        $Root,

                        [string[]]
                        [Parameter(Position=1, ValueFromRemainingArguments)]
                        $Extra)
                    $Extra.Count;
                    for ($i = 0; $i -lt $Extra.Count; $i++)
                    {
                       "${i}: $($Extra[$i])"
                    }
                } root aa,bb
               
               Expected behavior
               -----------------
               The array should be bound to the parameter just as you sent it, the same way it works for cmdlets.
               (The "ValueFromRemainingArguments" behavior isn't used, in this case, it should just bind like any
               other array parameter type.)  The output of the above script block should be:

               2
               0: aa
               1: bb

               Actual behavior
               ---------------
               PowerShell appears to be performing type conversion on the argument to treat the array as a single
               element of the parameter's array, instead of checking first to see if more arguments will be bound as
               "remaining arguments" first.  The output of the above script block is currently:

               1
               0: aa bb

               Additional information
               ------------------

               To demonstrate that the behavior of cmdlets is different, you can use this code:

               Add-Type -OutputAssembly $env:temp\testBinding.dll -TypeDefinition @'
                   using System;
                   using System.Management.Automation;

                   [Cmdlet("Test", "Binding")]
                   public class TestBindingCommand : PSCmdlet
                   {
                       [Parameter(Position = 0)]
                       public string Root { get; set; }

                       [Parameter(Position = 1, ValueFromRemainingArguments = true)]
                       public string[] Extra { get; set; }

                       protected override void ProcessRecord()
                       {
                           WriteObject(Extra.Length);
                           for (int i = 0; i < Extra.Length; i++)
                           {
                               WriteObject(String.Format("{0}: {1}", i, Extra[i]));
                           }
                       }
                   }
               '@

               Import-Module $env:temp\testBinding.dll

               Test-Binding root aa,bb
               

               Environment data
               ----------------

               <!-- provide the output of $PSVersionTable -->

               > $PSVersionTable
               Name                           Value
               ----                           -----
               PSEdition                      Core
               PSVersion                      6.0.0-alpha
               PSCompatibleVersions           {1.0, 2.0, 3.0, 4.0...}
               WSManStackVersion              3.0
               GitCommitId                    v6.0.0-alpha.9-107-g203ace04c09dbbc1ac00d6b497849cb69cc919fb-dirty
               PSRemotingProtocolVersion      2.3
               CLRVersion
               SerializationVersion           1.1.0.1
               BuildVersion                   3.0.0.0
```

That is a detailed issue.

Now, we might wonder who are the top 5 contributors (in terms of Pull requests) to the PowerShell documentation project :

```powershell
C:\> $DocsPR = Find-GitHubIssue -Type pr -Repo 'PowerShell/PowerShell-Docs'
C:\> $DocsPR | Group-Object { $_.user.login } |
>> Sort-Object -Property 'Count' -Descending | Select-Object -First 5

Count Name                      Group
----- ----                      -----
  141 eslesar                   {@{url=https://api.github.com/repos/PowerShell/PowerShell-Docs/issues/650; repositor...
   81 HemantMahawar             {@{url=https://api.github.com/repos/PowerShell/PowerShell-Docs/issues/656; repositor...
   59 alexandair                {@{url=https://api.github.com/repos/PowerShell/PowerShell-Docs/issues/627; repositor...
   32 juanpablojofre            {@{url=https://api.github.com/repos/PowerShell/PowerShell-Docs/issues/657; repositor...
   28 neemas                    {@{url=https://api.github.com/repos/PowerShell/PowerShell-Docs/issues/107; repositor...
```

## Find-GithubUser :  

GitHub.com is the largest open-source software community, so it is a great place to find passionate and talented coders who are willing to share their craft with the community.

Let's say you are a recruiter or a hiring manager and you are looking for a PowerShell talent in Ireland.  
The cmdlet `Find-GithubUser` can facilitate that search :

```powershell
C:\> Find-GithubUser -Type user -Language 'PowerShell' -Location 'Ireland' |
>> Where-Object { $_.Hireable }

UserName      : JunSmith
Full Name     : Jun Smith
Type          : User
Url           : https://github.com/JunSmith
Company       :
Blog          :
Location      : Ireland
Email Address :
Hireable      : True
Bio           :
Repos         : 12
Gists         : 0
Followers     : 7
Following     : 4
Joined        : 2015-01-17T13:27:24Z

UserName      : TheMasterPrawn
Full Name     : Rob Allen
Type          : User
Url           : https://github.com/TheMasterPrawn
Company       : Unity Technology Solutions IRL
Blog          :
Location      : Ireland
Email Address :
Hireable      : True
Bio           : I.T/Dev guy, gamer, geek living and working in Ireland.
Repos         : 3
Gists         : 0
Followers     : 0
Following     : 0
Joined        : 2014-06-10T11:09:20Z
```

2 users only. That's helpful ... It highlights the huge PowerShell skills gap we have in Ireland.

Let's focus on UK and organizations, then.  
Organizations don't have followers so we cannot filter them on the number of followers they have, but we can narrow down the search to those which have 5 or more repos :

```powershell
C:\> Find-GithubUser -Type org -Language 'PowerShell' -Location 'UK' -Repos '>=5'

UserName      : SpottedHyenaUK
Full Name     : Spotted Hyena UK
Type          : Organization
Url           : https://github.com/SpottedHyenaUK
Company       :
Blog          : http://www.spottedhyena.co.uk
Location      : Leeds, UK
Email Address :
Hireable      :
Bio           :
Repos         : 5
Gists         : 0
Followers     : 0
Following     : 0
Joined        : 2015-02-03T14:38:16Z

UserName      : VirtualEngine
Full Name     : Virtual Engine
Type          : Organization
Url           : https://github.com/VirtualEngine
Company       :
Blog          : http://virtualengine.co.uk
Location      : UK
Email Address : info@virtualengine.co.uk
Hireable      :
Bio           :
Repos         : 17
Gists         : 0
Followers     : 0
Following     : 0
Joined        : 2014-03-21T14:51:14Z
```

That was just a few examples, but since each of these cmdlets have many parameters, this was just scratching the surface of what can be done with them.  
For the full list of parameters (and how to use them), please refer to [the README file on GitHub](https://github.com/MathieuBuisson/PSGithubSearch/blob/master/README.md) or use `Get-Help`.

Also, I'm aware it's not perfect so issues and pull requests are very much welcome.
