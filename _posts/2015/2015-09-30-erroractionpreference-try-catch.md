---
title: A warning on $ErrorActionPreference and Try/Catch for .NET developers
tags: [.NET, PowerShell]
---

I recently stumbled upon a PowerShell Script from a .NET Developer/Architect who shall remain nameless, which contained this :

```powershell
# set error action preference so errors don't stop and the trycatch 
# kicks in to handle gracefully
$ErrorActionPreference = "Continue" 
try {
    ...
    ...
}
catch {
    ...
    ...
}
```

Let me this say this bluntly : this is a **HUGE** misunderstanding of error handling in PowerShell.  
Yes, PowerShell is based on the .NET Framework.  
Yes, it understands the different types of exceptions which are in the Framework class library.  
Yes, it uses `Try{} Catch{}` or `Try{} Catch{} Finally{}` to handle errors like in C#.  
**But** PowerShell has its idiosyncrasies.  

In C#, we can choose to handle exceptions using `Try{} Catch{}` or to not handle the exception in the current method and let the CLR look for a `Catch` block in another method somewhere up the call stack.

First, in PowerShell, we generally don't use the term "exception", we use the term "error", but that's mainly a terminology thing.

The big catch (pun intended) is that Powershell have <em>terminating</em> errors and <em>non-terminating</em> errors.  
A <em>terminating error</em> is raised by a cmdlet when something is wrong, so wrong that it cannot continue processing any other items in the pipeline and it has to stop immediately.  
Generally, this is because the cmdlet doesn't know what the hell you are talking about (a syntax or a type-related error).

A <em>non-terminating error</em> is raised by a cmdlet when something is wrong but it does not prevent the cmdlet from processing the other items in the pipeline. Here is a example of a non-terminating error :

```powershell
C:\> Get-ChildItem 'DoesNotExit', 'DoesExit'
Get-ChildItem : Cannot find path 'C:\DoesNotExit' because it does not exist.
At line:1 char:1
+ Get-ChildItem 'DoesNotExit', 'DoesExit'
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\DoesNotExit:String) [Get-ChildItem],
   ItemNotFoundException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.GetChildItemCommand


    Directory: C:\


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----        7/27/2015  10:37 PM              0 DoesExit
 
```

We can see that `Get-ChildItem` raises an error because it cannot find the file `DoesNotExist`, but it keeps going and processes the second file name.

The second part of the catch (pun intended again), and this is where many PowerShell beginners get tripped up, is that **the `Catch` block will execute only if a cmdlet in the `Try` block raises a terminating error**.  
So, the `Get-ChildItem` example above would not trigger the `Catch` block.

2 possible solutions :  
  - Set the global variable `$ErrorActionPreference` to "Stop"  
  - Use the cmdlet parameter `-ErrorAction` to ensure any error from that cmdlet is terminating.  
  
Personally, I prefer the latter because messing with global variables can affect other scripts/modules/commands (and it hurts puppies).

```powershell
C:\> Get-ChildItem 'DoesNotExit', 'DoesExit' -ErrorAction Stop
Get-ChildItem : Cannot find path 'C:\DoesNotExit' because it does not exist.
At line:1 char:1
+ Get-ChildItem 'DoesNotExit', 'DoesExit' -ErrorAction Stop
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\DoesNotExit:String) [Get-ChildItem],
   ItemNotFoundException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.GetChildItemCommand

```

This time, `Get-ChildItem` stops immediately and doesn't process any other file.

So now that we understand how errors are handled by PowerShell cmdlets, how do we fix the script to ensure that the `Catch{}` will be executed when an error occurs in the `Try{}` ?

```powershell
Try {
    # cmdlets which might raise terminating or non-terminating errors
    Get-ChildItem 'DoesNotExit', 'DoesExit' -ErrorAction Stop
    ...
}
Catch {
    # Error handling code
    ...
}
```

Now, any error raised by `Get-ChildItem` will immediately stop execution and run whatever error handling code we put in the `Catch` block.

So, my advice to developers coming from C# or any other language to PowerShell is : don't try to guess PowerShell behaviours based on the behaviours of other languages. In fact, as an engineer, you should **never make assumptions**.

Remember, the root cause of any bug is that someone, somewhere, made an assumption.
