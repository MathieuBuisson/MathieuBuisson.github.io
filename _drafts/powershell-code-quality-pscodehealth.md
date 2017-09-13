---
title: 'Assessing PowerShell code quality and maintainability with PSCodeHealth'
tags: [PowerShell, Quality]
---

## What is PowerShell code quality ?  

Code quality is a vast subject and a somewhat subjective notion, so what we are going to cover here is my personal view on code quality **for PowerShell**, which forms the basis for `PSCodeHealth`.  

Instead of engaging in potentially very long-winded and abstract discussions about what is quality, we'll focus on tangible attributes which can be observed by looking at (or parsing) the code.  

![WTF is quality ?]({{ "/images/powershell-code-quality-pscodehealth-wtf.png" | absolute_url }})  

High-quality PowerShell code tends to have the following characteristics :  

### It follows best practices

For PowerShell (as for any language), the community has arrived to a consensus regarding many different practices. For example :  
  - Avoid using aliases in scripts/modules  
  - Avoid hard-coding credentials (especially in plain text) in scripts/modules  
  - Avoid using `Write-Host`  

Of course, there are exceptions to these rules but they are widely accepted as practices that should **generally** be followed. These rules exist for a reason, they prevent various kind of problems. For example, the 3 rules mentioned above help prevent the following issues, respectively :  
  - Aliases tend to be less readable and lesser known than the full command name.    
  - Credentials in plain text can be read by anyone who read the script/module. These credentials can be reused for other purposes, potentially malicious.  
  - There are multiple reasons **not** to use `Write-Host`, [Jeffrey Snover](http://www.jsnover.com/blog/2013/12/07/write-host-considered-harmful/), [Don Jones](http://windowsitpro.com/blog/what-do-not-do-powershell-part-1) and others have explained these reasons so I'm not going to re-hash them again here.  

### It follows a consistent style  

There are other practices which are more a matter of personal (or team) preference, like :  
  - Indentation  
  - Opening braces on the same line or a new line  
  - Capitalization
  - Naming conventions (especially for variables)  

The main rule for these type of practices is more akin to :  
> Pick a style and stick to it.  

What matters here is **consistency** across the file/module/project or across the team.  
Consistency improves readability because anyone reading or reviewing the code can train one's eye to a given style aspects and use that to read the code more quickly.  

On the contrary, everytime the consistency is broken (for example, an opening brace on a new line as opposed to the same line for the rest of the file), the reader is slowed down and/or confused.  

When working as part of a team, style consistency reduces the number of *not-so-obvious* and *not-so-useful* changes in source control, for example commits consisting only in :  
  - Changing a tab into 4 spaces  
  - Adding a blank line between 2 code blocks  
  - Changing a pair of double quotes into single quotes  

You don't want these silly little things to delay the merging of your pull requests, do you ?  


