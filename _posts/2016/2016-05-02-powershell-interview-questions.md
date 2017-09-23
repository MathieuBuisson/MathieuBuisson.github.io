---
title: My favorite PowerShell interview questions
tags: [Career, PowerShell]
---

As you may already know, the only PowerShell certification program [is being abandoned](http://powershell.org/wp/2016/04/22/verified-effective-exam-results/). Some people in the PowerShell community are trying to justify this by saying "There is no need for PowerShell cert" or "it's too difficult to test PowerShell knowledge".  

This makes me sad and even, a little bit angry. The reason I feel so strongly about this is not because I am one of the few who passed this exam, it is because I utterly disagree with these arguments.  

First, as the *DevOps* culture and practices pervade more and more Windows shops, professional PowerShell development skills (and the assessment of these skills) are becoming more and more critical for both employers and IT professionals.  
Second, assessing PowerShell knowledge is not more difficult than assessing Java, C# or T-SQL skills, though there are certifications on all of these.

I could rant about this for ages, but instead, I'm going to show that evaluating someone's PowerShell skills is not that difficult by sharing some of the PowerShell questions I ask to potential future colleagues during technical job interviews.

### What is your scripting experience ?  

This serves as an ice-breaker. Hopefully, the candidate will be happy and passionate to talk about the scripts he/she has written and his/her cool projects. This is great to get an idea of the candidate's experience (or his perception of his experience).  

Notice I said "scripting experience" not "PowerShell scripting experience". This is very much on purpose. If the candidate has scripting experience in at least one other language, I jump with 2 feet in the next question :

### Can you tell me two major differences between `$Other_Language` and PowerShell ?

This question is an fantastic opportunity get an insight into the candidate understanding of PowerShell core concepts and his/her favourite PowerShell features.  

For example, one of the most fundamental difference between bash and PowerShell is that bash is text-oriented whereas PowerShell is object-oriented.  
A good candidate should be able to tell that. A great candidate, would most likely go on and on about the benefits of the object-oriented nature of PowerShell.

Also, if a candidate cites 2 valid differences between the two languages, but not a major one, the candidate might have a partial knowledge of PowerShell.

### How would you set a registry value with PowerShell ?

Yeah, we start easy, but it is not that intuitive. This requires to know that there is no registry-specific cmdlets, so we have to use the registry provider and `Set-ItemProperty`.  

The registry has been an integral part of Windows for ever, so this is hardly area-specific knowledge. It is very likely that any PowerShell scripter has already performed this task at least once, maybe even on a almost-daily basis.

### How would you ping a remote computer with 5 packets using PowerShell ?

Again, this is basic stuff. I wouldn't get caught up in ideology, the good old `ping.exe` is perfectly valid, as long as the candidate knows the option to specify 5 packets.  
If you really want the more *PowerShelly* `Test-Connection`, then ask : I just want the command to return `$True` if the ping is successful and `$False` if it is not.

### If I run : `Get-Service -Name "bits" | Start-Process` what is going to happen ?

Now, we are finally in the thick of it. The pipeline is such an important underlying concept of PowerShell. This is a very concrete, practical way of asking :

> How does the PowerShell pipeline work ?  

This variant is a bit vague, but **open questions have their place** : this allows to verify how articulate the candidate is when explaining complex technical concepts.  
If the interview is for a senior position, the ability to explain complex mechanisms to less technical people (junior team members, managers, etc...) is very valuable.

Yet another variant on the same topic would be :

### What are the 2 ways for a PowerShell cmdlet to accept input from the pipeline ?  

I really love this one. A good candidate should understand that objects in the pipeline are not miraculously bound to the next cmdlet, they are bound to a specific parameter of the next cmdlet.  
A great candidate will tell the 2 ways in which a parameter can take pipeline input quickly and effortlessly.

If he/she gives the 2 ways but struggles to find this information in his/her memory, that's kinda suspicious. 
To me, that would mean the candidate has read about it when preparing for the interview but doesn't master the concept and has never implemented pipeline input in his/her functions.

Also, the 2 ways are evaluated in a specific order, a strong candidate should know which way is tried first.

### You have a script which uses `Read-Host` to prompt the user for an IP address. You need to make sure the user inputs a valid IP address. How would you do that ?

A good candidate would probably use one of 2 ways :  
  - Splitting the address in 4 elements and try to cast them to a `[byte]`  
  - A regular expression  

A great candidate would use the much simpler and more robust method : let the .NET Framework do the hard work and just try to cast the input string to the `[System.Net.IPAddress]` class.  
By the way, the candidate should know that what we get from `Read-Host` is a `[string]`.

### What is the difference, in PowerShell, between a function and an "advanced function" ?

This could be a trick question for an average candidate, but normally, good candidates should know that the only thing that makes a function *advanced* and unlocks the wonderful tooling which comes with it is : `[CmdletBinding()]`.  

A great candidate would be pretty enthusiastic about all the powerful tools enabled by advanced functions. Any PowerShell scripter who strives to build professional-grade tools should be thankful for all the work PowerShell is doing for us.

### To display a text message to the user, when would you rather use `Write-Host` instead of `Write-Output` ?

This is a very popular topic in the PowerShell community and a little controversial. As **Don Jones** famously said :  

> A puppy dies every time you use `Write-Host`  

An experienced PowerShell professional would say something like :  

> The general best practice is to NOT use `Write-Host`, unless ...  

Off the top of my head, I see 3 cases where `Write-Host` makes more sense than `Write-Output` :  
  - A script where we don't care about outputting to the pipeline  
  - The end-users want pretty colors  
  - Build scripts : most CI platforms capture the console output into the build logs  

### In a Try block, you have this code : `Format-Volume -DriveLetter 'C' -ErrorAction SilentlyContinue` What is the problem with that ?  

Proper and deliberate error handling makes the difference between a script that any amateur can hack together and a professional-grade tool which can be used in production.  
This particular question highlights two fundamental aspects of error handling in PowerShell. In fact, these are so important that I wrote [a whole blog post]({{- site.url -}}{% post_url 2015/2015-09-30-erroractionpreference-try-catch %}) on this very subject.

This question should be pretty obvious to a good candidate. If the candidate goes in the wrong direction, emphsize that part of the question : **"inside a Try block"**. If he/she is even more confused by this hint, then he/she doesn't understand PowerShell error handling.

### In PowerShell DSC, what is the file extension of the configuration document that is applied by the DSC agent on the target node ?  

Answering this one doesn't even require to have real-world experience with DSC.  
It is my way of checking if the candidate has ever heard about PowerShell DSC, and if he/she was curious enough to spend about 30 minutes to an hour reading up on it.  

Being curious and genuinely interested in learning new things is becoming crucial in this rapidly changing IT world.

## To ask if the candidate has indicated PowerShell DSC as a skill/strength :

### You write a DSC resource and you are working on `Test-TargetResource`. What should be the output of this function ?  

Anyone who has ever written a MOF-based DSC resource should know that, especially if using the `xDSCResourceDesigner` module to create the resource scaffolding. I would tend to think that anything which is included in the template generated that `xDSCResourceDesigner` is fair game.

Also, PowerShell practitioners should be able to guess the answer, even without any DSC resource authoring experience.
How ? Simply by remembering that cmdlets with a common verb tend to have consistent behaviours.  
So, what is a common output for `Test-*` cmdlets, `Test-Path` for example ?

### You write a DSC resource and you are working on `Get-TargetResource`. What should be the output of this function ?

Again, the answer is explicitly written in the template generated by the `xDSCResourceDesigner` module and its `New-xDscResource` cmdlet.

### And what should be the output of Set-TargetResource ?  

This might be a slightly trick question : there is no return type requirement for this function.  
But I think asking about the output of each function in a DSC resource is an effective way of probing the candidate's resource authoring experience and understanding of each function's purpose.

Also, if the candidate has more experience in authoring class-based DSC resources, it is easy to switch to the class-based variants :  

> What is the return type of the `Get` method ? What about the `Test` method ?  

Again, this is explicitly written in the PowerShell ISE (and likely other PowerShell editors) built-in snippets, so this can be considered essential knowledge for any DSC resource author.

So, assessing someone's PowerShell skills/knowledge is really not that difficult, as long as the interviewer ask the right questions and knows his stuff.  
By "asking the right questions", I mean 2 things :  
  - Steer away from area-specific or product-specific knowledge (like Exchange, SQL Server or VMware...) unless it is relevant for the job  
  - Focus on probing the candidate's mastery of PowerShell fundamental concepts and the ability to apply them
