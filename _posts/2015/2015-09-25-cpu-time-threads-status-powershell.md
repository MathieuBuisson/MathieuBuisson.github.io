---
title: Getting the CPU time and status of threads in a process with PowerShell
tags: [Performance, Windows]
---

If there is a process hanging or consuming CPU resources and you have no idea why, a good place to start is to have a look at its threads and what they are doing.

Fortunately, Threads are a property of the object you get when run Get-Process :

<a href="http://theshellnut.com/wp-content/uploads/2015/09/SelectThreads.png"><img src="http://theshellnut.com/wp-content/uploads/2015/09/SelectThreads.png" alt="SelectThreads.png"/></a>

Here, we just see an array of numbers, not very informative.

But these objects returned by Get-Process are very rich and their “Threads” property have their own set of properties and methods :

<a href="http://theshellnut.com/wp-content/uploads/2015/09/ThreadsMembers.png"><img src="http://theshellnut.com/wp-content/uploads/2015/09/ThreadsMembers.png" alt="ThreadsMembers.png"/></a>

I cut the output for brevity, but there are a total of 16 properties for the ProcessThread objects, so we have a lot to play with !

Here are the most interesting properties to see the threads which are consuming CPU time, what kind of CPU time and, if they are waiting, what they are waiting for:

<a href="http://theshellnut.com/wp-content/uploads/2015/09/InterestingProperties.png"><img src="http://theshellnut.com/wp-content/uploads/2015/09/InterestingProperties.png" alt="InterestingProperties.png"/></a>

This is showing a lot of potential but the property values are not very human-readable.
So, I did some <del>member-massaging</del> properties customization and addition, to get the times in a more usable format : percentage and seconds.
I ended up with a function, which takes one or more process IDs from a parameter called ID :

```powershell
#Requires -Version 2
function Get-ProcessThreadsInfo {
 
    [cmdletbinding()]
    param(
        [Parameter(Mandatory=$true)]
        [int32[]]$ID
    )
    $Processes = Get-Process -Id $ID
 
    Foreach ($Process in $Processes) {
 
        # Displaying the process name
        Write-Output $Process.ProcessName.ToUpper()
        Write-Output "`r"
 
        # Displaying of threads and the number of threads consuming CPU time in this process
        $NumberOfThreads = ($Process | Select-Object -ExpandProperty Threads | Measure-Object).count
        $NumberofThreadsWithCPUTime = ($Process | Select-Object -ExpandProperty Threads |
        Where-Object { $_.TotalProcessorTime.Ticks -ne 0 } | Measure-Object).count

        Write-Output "Number of threads in this process : $NumberOfThreads "
        Write-Output "Number of threads consuming CPU time in this process : $NumberofThreadsWithCPUTime "
 
        # Extracting the threads objects from each process
        $ProcessThreads = $Process | Select-Object -ExpandProperty Threads | Where { $_.TotalProcessorTime.Ticks -ne 0 }
 
        Foreach ($ProcessThread in $ProcessThreads) {
 
            # Building custom properties for my threads objects
            $ThreadID = @{L="ThreadID";E={ $ProcessThread.Id }}
            $CPUTimeProperty = @{L="CPU Time (Sec)";E={ [math]::round($ProcessThread.TotalProcessorTime.TotalSeconds,2) }}
            $UserCPUTimeProperty = @{ L="User CPU Time (%)";E={ [math]::round((($ProcessThread.UserProcessorTime.ticks / $ProcessThread.TotalProcessorTime.ticks)*100),1) }}
            $SystemCPUTimeProperty = @{L="System CPU Time (%)";E={ [math]::round((($ProcessThread.privilegedProcessorTime.ticks / $ProcessThread.TotalProcessorTime.ticks)*100),1) }}
            $State = @{L="State";E={ $ProcessThread.ThreadState }}
 
            # Mapping the possible values of WaitReason to their actual meaning (source: https://msdn.microsoft.com/en-us/library/tkhtkxxy(v=vs.110).aspx)
            switch ($ProcessThread.WaitReason) {
                EventPairHigh { $Wait_ReasonPropertyValue =
                "Waiting for event pair high.Event pairs are used to communicate with protected subsystems." ; break }
                
                EventPairLow { $Wait_ReasonPropertyValue =
                "Waiting for event pair low. Event pairs are used to communicate with protected subsystems." ; break }
                
                ExecutionDelay { $Wait_ReasonPropertyValue =
                "Thread execution is delayed." ; break }
                
                Executive { $Wait_ReasonPropertyValue =
                "The thread is waiting for the scheduler." ; break }
                
                FreePage { $Wait_ReasonPropertyValue =
                "Waiting for a free virtual memory page." ; break }
                
                LpcReceive { $Wait_ReasonPropertyValue =
                "Waiting for a local procedure call to arrive."; break }
                
                LpcReply { $Wait_ReasonPropertyValue =
                "Waiting for reply to a local procedure call to arrive." ; break }
                
                PageIn { $Wait_ReasonPropertyValue =
                "Waiting for a virtual memory page to arrive in memory." ; break }
                
                PageOut { $Wait_ReasonPropertyValue =
                "Waiting for a virtual memory page to be written to disk." ; break }
                
                Suspended { $Wait_ReasonPropertyValue =
                "Thread execution is suspended." ; break }
                
                SystemAllocation { $Wait_ReasonPropertyValue =
                "Waiting for a memory allocation for its stack." ; break }
                
                Unknown { $Wait_ReasonPropertyValue =
                "Waiting for an unknown reason." ; break }
                
                UserRequest { $Wait_ReasonPropertyValue =
                "The thread is waiting for a user request." ; break }
                
                VirtualMemory { $Wait_ReasonPropertyValue =
                "Waiting for the system to allocate virtual memory." ; break }
                
                Default { $Wait_ReasonPropertyValue = " " ; break }
            }
 
            # Creating the custom output object
            $ProcessThread | Select-Object -Property $ThreadID, StartTime, $CPUTimeProperty, $UserCPUTimeProperty, $SystemCPUTimeProperty, $State |
            Add-Member -NotePropertyName "Wait Reason" -NotePropertyValue $Wait_ReasonPropertyValue -PassThru 
        }
    }
}
```

The output looks like this :

<a href="http://theshellnut.com/wp-content/uploads/2015/09/Get-ProcessThreadsInfo.png"><img src="http://theshellnut.com/wp-content/uploads/2015/09/Get-ProcessThreadsInfo.png" alt="Get-ProcessThreadsInfo.png"/></a>

This is not exhaustive or deep information by any means, but it can be a starting point to drill down further with other tools.

As you can see, Internet Explorer (iexplore) is waiting for me, so… gotta go.
