---
title: Powershell equivalent for common Linux/bash commands
tags: [bash, PowerShell]
---

The majority of my colleagues have more of a Linux background than Windows. So their `cat` and their `grep` are near and dear to their heart and their first reflex when they get into PowerShell is to replicate these commands.

First, this is not always a good approach because bash and PowerShell are fundamentally different. When you run bash commands or external executables in bash, you get plain text. When you run PowerShell cmdlets you get objects.  
So quite often, translating the bash way of doing things to PowerShell is the bad way of doing things. Powershell gives you rich objects with properties and methods to easily extract the information you need and/or to manipulate them in all sorts of ways. Use this to your advantage !

Still, I'm going to do this translation exercise for a few basic commands because it can be an interesting learning exercise for bash users coming to PowerShell. Besides, this is an opportunity to illustrate fundamental differences between bash and PowerShell.

### pwd :

`Get-Location`  
By the way, PowerShell has been designed to be user-friendly, even "old-school-Unix-shell-user"-friendly, so there are built-in aliases for popular Linux/bash commands which are pointing to the actual cmdlet.  
For example, bash users can still let their muscle memory type `pwd`, because it is an alias to the cmdlet `Get-Location`. Other alias to this cmdlet : `gl`.

### cd :

The cmdlet is `Set-Location`, but you can use the aliases `cd`, `sl` or `chdir` if you have old habits or to save typing when you are using PowerShell interactively at the console.

### ls :

`Get-ChildItem`  
Conveniently, there is the built-in `ls` alias for those who come from bash and `dir` for those who come from cmd.exe.  
A parameter combination which is frequently used is `ls -ltr`, it sorts the items to get the most recently modified files at the end.
The PowerShell equivalent would be :  
```powershell
Get-ChildItem | Sort-Object -Property LastWriteTime
```

<a href="http://theshellnut.com/wp-content/uploads/2015/09/Get-ChildItem-Sort-Object.png"><img src="http://theshellnut.com/wp-content/uploads/2015/09/Get-ChildItem-Sort-Object.png" alt="Get-ChildItem Sort-Object" width="1036" height="482" class="alignnone size-full wp-image-115" /></a>

Notice how close to plain English the syntax is. This helps you to <strong><em>"Think it, type it, get it"</em></strong> as Jeffrey Snover likes to say.
Sorting is based on a property, not a column, so you don't need to know the column number, you just need the property name.

### find :

`Get-ChildItem`, but this time with the `Include` (or `Filter`) and `Recurse` parameters.
For example, a common use case of find is to look recursively for files which have a case-insensitive string in their name.
```bash
find . -type f -iname "snapshot"
```

PowerShell is case-insensitive in general, so we have nothing in particular to do in this regard :  
```powershell
Get-ChildItem -Filter "*snapshot*" -Recurse -File
```

### cp :

`Copy-Item`  
Let's say you want to copy a folder called "HolidayPictures" including all its sub-directories to your home directory, in bash you run :
[bash]cp -R HolidayPictures ~/ [/bash]
In Powershell on a windows machine, you would run :
```powershell Copy-Item -Path ".\HolidayPictures\" -Destination "$env:USERPROFILE\" -Recurse```
"$env:" is a scope modifier, it tells PowerShell to look for the variable named USERPROFILE in a special scope : the environment. This is a convenient way to use environment variables.

In addition, the -Path and -Destination parameters are positional. -Path is at position 1 and -Destination is at position 2, so the following command will do the same as the previous one :
```powershell Copy-Item ".\HolidayPictures\" "$env:USERPROFILE\" -Recurse```
To save even more typing, you could use the aliases "cp", "copy" or "cpi".

<h2>rm :</h2>

Here is the equivalent of the (in)famous `rm -rf` :
```powershell Remove-Item -Recurse -Force ```
And if you tell me it's too much typing, I'm going to throw aliases at you : "rm", "ri", "rmdir", "rd" and "del".

<h2>mkdir :</h2>

```powershell New-Item -ItemType directory -Name "MyNewFolder"```
It does create the parent if needed without any special parameter, so it works like `mkdir -p` as well.

<h2>touch :</h2>

For those who like to "touch" to create a bunch of files, the cmdlet `New-Item</strong>` can do it when specifying File for the -ItemType parameter.
A nice usage example is :
[bash] touch MyFile{1..4} [/bash]
This creates 4 files : Myfile1, Myfile2, Myfile3 and Myfile4.
Here is a simple way to do this (command + output) :
```powershell 1..4 | ForEach-Object { New-Item -ItemType file -Name "MyFile$_" }


    Directory: C:\Users\Administrator\Desktop

Mode                LastWriteTime     Length Name
----                -------------     ------ ----
-a---         10/1/2015  10:06 AM          0 MyFile1
-a---         10/1/2015  10:06 AM          0 MyFile2
-a---         10/1/2015  10:06 AM          0 MyFile3
-a---         10/1/2015  10:06 AM          0 MyFile4

```

This deserves a few explanations.
".." is the <strong>range</strong> operator, so "1..4" stands for 1,2,3,4.
`ForEach-Object ` is a special cmdlet used for iteration. It executes the scriptblock between the {} once for every object passed to it via the pipeline. If you are wondering what is the $_ in the example above, it is a representation of the object currently being processed, which was passed from the pipeline. So, in the example above, $_ stores the value 1, then it stores the value 2, then the value 3 and finally the value 4.

<h2>cat :</h2>

`Get-Content</strong>`. But even when you run this cmdlet against a text file, this doesn't output plain text, this outputs one object of the type string for each line in the file.
You can use its aliases : "cat", "gc" or "type".

<h2>tail :</h2>

[bash] tail -n7 ./MyScriptFile.ps1 [/bash]
This would output the last 7 lines of the file MyScriptFile.ps1
```powershell Get-Content -Tail 7 .\MyScriptFile.ps1```

The -Tail parameter has an alias : "-Last", this makes this parameter more discoverable for those who "Tail" would not even cross their mind because they don't have a Linux background.
This parameter was introduced with PowerShell 3.0.
An exceedingly valuable usage of the tail command for troubleshooting is ` tail -f` to display any new lines of a log file as they are written to the file. For this, there is the -Wait parameter, which was introduced in PowerShell 3.0 as well.

<h2>grep :</h2>

This is the one I get asked about the most : "How do you do 'grep' in Powershell ?", and my answer is : "Most of the time, <strong>you don't</strong>."
Think about what you are trying to achieve when you use grep : filtering lines of text which contain a specific value, string, or pattern. In Powershell, most of the time we are dealing with objects so what you want to achieve translates to : filtering the objects which have a specific value in one or more properties.
No text-parsing required here, unless you are dealing with objects of the type string.
Many cmdlets have built-in parameters which allows to filter the objects, but the generic filtering mechanism is the cmdlet `Where-Object</strong>`.
For example, to filter the processes which have a working set of more than 100 MB, you would run the following :
```powershell Get-Process | Where-Object { $_.WorkingSet -gt 104857600 }

Handles  NPM(K)    PM(K)      WS(K) VM(M)   CPU(s)     Id ProcessName
-------  ------    -----      ----- -----   ------     -- -----------
    713      63   103340     130240   709    12.70   1604 powershell
```

Notice that in the output, the WorkingSet property is displayed in KiloBytes, but this is due to the formatting view, the actual value is in bytes.
Since PowerShell version 3.0, Where-Object supports a simplified syntax, so the following would do the same as the previous command :
```powershell Get-Process | Where-Object WorkingSet -gt 104857600```
<a href="http://theshellnut.com/wp-content/uploads/2015/09/Where-Object.png"><img src="http://theshellnut.com/wp-content/uploads/2015/09/Where-Object.png" alt="Where-Object" width="1036" height="202" class="alignnone size-full wp-image-118" /></a>

By the way, in case you are dealing with strings and you really want to filter objects on a specific string or pattern, you can use `<strong>Select-String</strong>`.
One use case is working with a plain text log file, like the WindowsUpdate.log :
```powershell Select-String -Path C:\Windows\WindowsUpdate.log -Pattern "Failed"

C:\Windows\WindowsUpdate.log:2264:2013-09-25    03:07:45:709     856    670    Agent    WARNING: Failed to
evaluate Installed rule, updateId = {818701AF-1182-45C2-BD1E-17068AD171D6}.101, hr = 80242013
C:\Windows\WindowsUpdate.log:2265:2013-09-25    03:07:49:157     856    670    Agent    WARNING: failed to
calculate prior restore point time with error 0x80070002; setting restore point
C:\Windows\WindowsUpdate.log:4692:2013-09-25    12:02:03:967     972    380    Misc    WARNING: WinHttp:
SendRequestToServerForFileInformation MakeRequest failed. error 0x8024402c
C:\Windows\WindowsUpdate.log:4693:2013-09-25    12:02:03:967     972    380    Misc    WARNING: WinHttp:
SendRequestToServerForFileInformation failed with 0x8024402c
C:\Windows\WindowsUpdate.log:4694:2013-09-25    12:02:03:967     972    380    Misc    WARNING: WinHttp:
ShouldFileBeDownloaded failed with 0x8024402c
```
And if you are a regular expression nerd, you can feed them to the -Pattern parameter.

<h2>uname :</h2>

For example, `uname -a` outputs the OS, the hostname, the kernel version and the architecture.
A good way to get the equivalent information on a Windows machine with PowerShell is to use the Win32_OperatingSystem class from CIM/WMI :
```powershell Get-CimInstance Win32_OperatingSystem | Select-Object -Property Caption, CSName, Version, BuildType, OSArchitecture |
Format-Table -AutoSize

Caption                         CSName   Version  BuildType           OSArchitecture
-------                         ------   -------  ---------           --------------
Microsoft Windows 7 Enterprise  TOOLS-55 6.1.7601 Multiprocessor Free 64-bit

```
Yes, I know, it is much longer. Fortunately, there is tab completion for cmdlets, parameters, and even, sometimes, for parameter values.
The `Format-Table -AutoSize` is just to make the width of the output blog-friendly.

<h2>mkfs :</h2>

`<strong>New-Volume</strong>` or `Format-Volume` if the volume already exists.

<h2>ping :</h2>

Off course, you could run `ping.exe` from Powershell but if you want an object-oriented ping equivalent, there is the cmdlet `Test-Connection` :
```powershell Test-Connection 192.168.1.10 | Format-Table -AutoSize

Source   Destination  IPV4Address  IPV6Address Bytes Time(ms)
------   -----------  -----------  ----------- ----- --------
TOOLS-55 192.168.1.10 192.168.1.10             32    0
TOOLS-55 192.168.1.10 192.168.1.10             32    0
TOOLS-55 192.168.1.10 192.168.1.10             32    0
TOOLS-55 192.168.1.10 192.168.1.10             32    0

```
Here is what a ping failure looks like :
<a href="http://theshellnut.com/wp-content/uploads/2015/09/Test-Connection-Failure.png"><img src="http://theshellnut.com/wp-content/uploads/2015/09/Test-Connection-Failure.png" alt="Test-Connection Failure" width="1036" height="262" class="alignnone size-full wp-image-119" /></a>

Notice the -Count parameter which allows to specify the number of echo request to send.

<h2>man :</h2>

`Get-Help` (or just "help"). The PowerShell help system is extremely... helpful and it would deserve an entire article on its own.
To get the help information for a specific cmdlet, let's say Stop-Service :
```powershell Get-Help Stop-Service -Full```
The parameter -Full allows you to get everything : the description, the syntax, information on every parameter, usage examples...
You can also search help information on conceptual topics. Let's say you are a regular expression nerd and you want to know how they work :
```powershell Get-Help "about_regular*" ```
The help files for conceptual topics have a name starting with "about_" .

<h2>cut :</h2>

This is used to select one or more columns from a text input (usually a file). Because this is plain text, you need to do a mapping from the fields you want to column numbers, and depending on the format of the input, you may need to specify a delimiter to define the columns. In PowerShell, this text-parsing stuff is very seldom required because again, we deal with objects. You want to retain only some properties from some input objects, just use `Select-Object` and specify the property names. That's it.
```powershell Get-ChildItem *.txt | Select-Object -Property "Name", "Length" |
Format-Table -AutoSize

Name         Length
----         ------
Lab.txt         160
modif.txt      1710
To watch.txt     97
wifi.txt        860
```

The double-quotes surrounding the property names are not mandatory. They indicate that these are string values but because the -Property parameter of `Select-Object` expects strings, PowerShell is kind enough to cast (convert) these values to strings if we forget the double-quotes.

There are plenty of other commands and I cannot write on all of them, but if there are popular commands that you think should be there, please let me know and I will add them to this article.
