---
title: 'Assessing PowerShell code quality and maintainability with PSCodeHealth'
tags: [PowerShell, Quality]
excerpt: "In this article, we are going to start with what we mean by 'code quality' and why it matters. Then, we'll see how PSCodeHealth can help assess the quality and maintainability of a PowerShell project."
---

## What is PowerShell code quality ?  

Code quality is a vast subject and a somewhat subjective notion, so what we are going to cover here is my personal view on code quality **for PowerShell**, which forms the basis for `PSCodeHealth`.  

Instead of engaging in potentially long-winded and abstract discussions about what is quality, we'll focus on tangible attributes which can be observed and reasonably quantified by analyzing the code. This list of attributes is intentionally non-exhaustive, leaning towards where `PSCodeHealth` can help.  

![WTF is quality ?]({{ "/images/powershell-code-quality-pscodehealth-wtf.png" | absolute_url }})  

High-quality PowerShell code tends to have the following characteristics :  

### It follows general best practices, language guidelines and conventions

For PowerShell (as for any language), the community builds consensuses about what are considered *good* practices. For example :  
  - Avoid using aliases in scripts/modules  
  - Avoid hard-coding credentials (especially in plain text) in scripts/modules  
  - Avoid using `Write-Host`  

Of course, there are exceptions to these rules but it is accepted that they should **generally** be followed. These rules exist for a reason, they prevent various gotchas. For example, the 3 rules mentioned above help prevent the following (respectively) :  
  - Aliases tend to be less readable and lesser known than the full command name.    
  - Credentials in plain text can be read by anyone who can read the code and reused for other purposes, potentially malicious.  
  - There are multiple reasons **not** to use `Write-Host`, [Jeffrey Snover](http://www.jsnover.com/blog/2013/12/07/write-host-considered-harmful/), [Don Jones](http://windowsitpro.com/blog/what-do-not-do-powershell-part-1) and others have explained these reasons so I'm not going to re-hash them again here.  

**Conventions are immensely helpful** : they lower the "*barrier to understanding*" for reviewers/contributors and they make developers more productive. The more developers follow them, the more useful they are. So do yourself and your community a favor : use established conventions, unless you have a documented reason not to.  

To evaluate whether a piece of code follows sound practices and general language guidelines, this is where linting tools come in. In the PowerShell realm, we have [PSScriptanalyzer](https://github.com/PowerShell/PSScriptAnalyzer).  

### It follows a consistent style  

There are other practices which are more a matter of personal (or team) preference, like :  
  - Indentation  
  - Opening braces on the same line or a new line  
  - Capitalization
  - Naming conventions (especially for variables)  

The main rule for these type of practices is more akin to :  
> Pick a style and stick to it.  

What matters here is **consistency** across the file/module/project or across the team.  
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
This makes the code modular and understandable, because it organizes it into logical, single-responsibility chunks. A function is basically a named block of code and to help this tidy organization of the code, the name of a function should allow the reader to capture its purpose.  

Functions should generally follow PowerShell cmdlets `Verb-Noun` naming convention and this actually helps with keeping them single-purpose. If multiple verbs could used for a function name, this function is doing more than 1 type of operations and it should be split up. If we need an "And" or many words to compose a descriptive noun for a function name, this is also a sign that the function may be doing too many things.  

#### Short  

The most obvious argument, once again, goes back to readability.  

There is another argument in favor of short functions : it forces the developer to extract a lot of code into other functions, which are logically scoped, tightly focused and ... short. Also, a function which contains many calls to other functions with very intent-revealing names can read like a narrative. Human brains love narratives.  

#### Simple  


### Documented  

There is a reason I use the term "documented" and not "commented". Too much inline comments can clutter the code and can actually make it less readable.  
Inline comments should :  
  - Be used only when necessary  
  - Not state the obvious  
  - Used to explain the logic, not the syntax  
  - Not be needed if functions and variables names communicate clearly their intent/purpose  

A long descriptive name is better than a comment.  
On the other hand, there is a place where comments belong : **comment-based help**.  
Public functions should contains comment-based to provide the user a quick access to documentation (via `Get-Help`). Arguably, even private functions should be documented this way, for code reviewers/contributors.  

Besides, comment-based help can be turn into proper documentation using a tool like [platyPS](https://github.com/PowerShell/platyPS), inline comments cannot.

### Testable and tested  


For more information, I highly recommend reading **[Clean Code: A Handbook of Agile Software Craftsmanship](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)**. This is a fascinating deep dive into code quality fundamentals and probably the definitive reference on the subject.