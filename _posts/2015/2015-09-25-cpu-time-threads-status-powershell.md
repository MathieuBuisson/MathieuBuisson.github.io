---
title: Getting the CPU time and status of threads in a process with PowerShell
tags: [Performance, Windows]
---

If there is a process hanging or consuming CPU resources and you have no idea why, a good place to start is to have a look at its threads and what they are doing.  
Fortunately, Threads are a property of the object you get when run `Get-Process` :

```powershell
C:\> Get-Process -Id 10080 | Select-Object -Property 'Id', 'Threads'

   Id Threads
   -- -------
   10080 {8760, 9208, 15460, 4224...}
```

Here, we just see an array of numbers, not very informative. But these objects returned by `Get-Process` are actually very rich and their `Threads` property have their own set of properties and methods :

```powershell
C:\> (Get-Process -Id 10080).Threads | Get-Member


   TypeName: System.Diagnostics.ProcessThread

Name                      MemberType Definition
----                      ---------- ----------
Disposed                  Event      System.EventHandler Disposed(System.Object, System.EventArgs)
CreateObjRef              Method     System.Runtime.Remoting.ObjRef CreateObjRef(type requestedType)
Dispose                   Method     void Dispose(), void IDisposable.Dispose()
Equals                    Method     bool Equals(System.Object obj)
GetHashCode               Method     int GetHashCode()
GetLifetimeService        Method     System.Object GetLifetimeService()
GetType                   Method     type GetType()
InitializeLifetimeService Method     System.Object InitializeLifetimeService()
ResetIdealProcessor       Method     void ResetIdealProcessor()
ToString                  Method     string ToString()
BasePriority              Property   int BasePriority {get;}
Container                 Property   System.ComponentModel.IContainer Container {get;}
CurrentPriority           Property   int CurrentPriority {get;}
Id                        Property   int Id {get;}
IdealProcessor            Property   int IdealProcessor {set;}
PriorityBoostEnabled      Property   bool PriorityBoostEnabled {get;set;}
PriorityLevel             Property   System.Diagnostics.ThreadPriorityLevel PriorityLevel {get;set;}
PrivilegedProcessorTime   Property   timespan PrivilegedProcessorTime {get;}
ProcessorAffinity         Property   System.IntPtr ProcessorAffinity {set;}
Site                      Property   System.ComponentModel.ISite Site {get;set;}
StartAddress              Property   System.IntPtr StartAddress {get;}
StartTime                 Property   datetime StartTime {get;}
ThreadState               Property   System.Diagnostics.ThreadState ThreadState {get;}
TotalProcessorTime        Property   timespan TotalProcessorTime {get;}
UserProcessorTime         Property   timespan UserProcessorTime {get;}
WaitReason                Property   System.Diagnostics.ThreadWaitReason WaitReason {get;}
 
```

Here are the most interesting properties to help us answer performance-related questions, like :  
  - Which threads are consuming CPU time ?  
  - What kind of CPU time ?  
  - Are threads waiting for something ?  
  - What they are waiting for ?  

```powershell
C:\> $Properties = 'Id','TotalProcessorTime','UserProcessorTime',
>> 'PrivilegedProcessorTime','ThreadState','WaitReason'
C:\> (Get-Process -Id 10080).Threads | Format-Table $Properties

   Id TotalProcessorTime UserProcessorTime PrivilegedProcessorTime ThreadState   WaitReason
   -- ------------------ ----------------- ----------------------- -----------   ----------
 8760 00:00:00.1093750   00:00:00.0468750  00:00:00.0625000               Wait  UserRequest
 9208 00:00:00.0156250   00:00:00.0156250  00:00:00                       Wait  UserRequest
15460 00:00:00.0312500   00:00:00.0312500  00:00:00                       Wait EventPairLow
 7428 00:00:00.9062500   00:00:00.4687500  00:00:00.4375000               Wait  UserRequest
 8704 00:00:00           00:00:00          00:00:00                       Wait  UserRequest
17192 00:00:00           00:00:00          00:00:00                       Wait  UserRequest
11972 00:00:00           00:00:00          00:00:00                       Wait  UserRequest
 3600 00:00:00           00:00:00          00:00:00                       Wait  UserRequest
10844 00:00:00           00:00:00          00:00:00                       Wait  UserRequest
17240 00:00:00           00:00:00          00:00:00                       Wait  UserRequest
12428 00:00:00.0156250   00:00:00          00:00:00.0156250               Wait  UserRequest
14132 00:00:00.0156250   00:00:00.0156250  00:00:00                       Wait  UserRequest
  216 00:00:00.0468750   00:00:00.0312500  00:00:00.0156250               Wait  UserRequest
 3860 00:00:00.0468750   00:00:00.0468750  00:00:00                       Wait EventPairLow
 9376 00:00:00           00:00:00          00:00:00                       Wait EventPairLow
 5676 00:00:00           00:00:00          00:00:00                       Wait  UserRequest

 ```

This is showing a lot of potential but the property values are not very human-readable.
So, I did some <del>member-massaging</del> properties customization and addition, to get the times in a more usable format : percentages and seconds.  
I ended up with a function, which takes one or more process IDs from a parameter called `ID` :

```powershell
Function Get-ProcessThreadsInfo {
 
    [CmdletBinding()]
    Param (
        [Parameter(Mandatory)]
        [int32[]]$ID
    )
    $Processes = Get-Process -Id $ID
 
    Foreach ($Process in $Processes) {
 
        $ProcessThreads = $Process.Threads
        $ThreadsWithCPUTime = $ProcessThreads | Where-Object { $_.TotalProcessorTime.Ticks -ne 0 }
 
        Foreach ($ProcessThread in $ThreadsWithCPUTime) {

            # Mapping the possible values of WaitReason to their actual meaning
            # source: https://msdn.microsoft.com/en-us/library/tkhtkxxy(v=vs.110).aspx
            Switch ($ProcessThread.WaitReason) {

                EventPairHigh { $Wait_ReasonPropertyValue =
                'Waiting for event pair high.Event pairs are used to communicate with protected subsystems'; break }
                
                EventPairLow { $Wait_ReasonPropertyValue =
                'Waiting for event pair low. Event pairs are used to communicate with protected subsystems'; break }
                
                ExecutionDelay { $Wait_ReasonPropertyValue =
                'Thread execution is delayed'; break }
                
                Executive { $Wait_ReasonPropertyValue =
                'The thread is waiting for the scheduler'; break }
                
                FreePage { $Wait_ReasonPropertyValue =
                'Waiting for a free virtual memory page'; break }
                
                LpcReceive { $Wait_ReasonPropertyValue =
                'Waiting for a local procedure call to arrive'; break }
                
                LpcReply { $Wait_ReasonPropertyValue =
                'Waiting for reply to a local procedure call to arrive'; break }
                
                PageIn { $Wait_ReasonPropertyValue =
                'Waiting for a virtual memory page to arrive in memory'; break }
                
                PageOut { $Wait_ReasonPropertyValue =
                'Waiting for a virtual memory page to be written to disk'; break }
                
                Suspended { $Wait_ReasonPropertyValue =
                'Thread execution is suspended'; break }
                
                SystemAllocation { $Wait_ReasonPropertyValue =
                'Waiting for a memory allocation for its stack'; break }
                
                Unknown { $Wait_ReasonPropertyValue =
                'Waiting for an unknown reason'; break }
                
                UserRequest { $Wait_ReasonPropertyValue =
                'The thread is waiting for a user request'; break }
                
                VirtualMemory { $Wait_ReasonPropertyValue =
                'Waiting for the system to allocate virtual memory'; break }
                
                Default { $Wait_ReasonPropertyValue = ''; break }
            } 
 
            # Building custom properties for my threads objects
            $Properties = @{
                ThreadID = $ProcessThread.Id
                StartTime = $ProcessThread.StartTime
                'CPUTime (Sec)' = [math]::round($ProcessThread.TotalProcessorTime.TotalSeconds,2)
                'User CPUTime (%)' = [math]::round((($ProcessThread.UserProcessorTime.ticks / $ProcessThread.TotalProcessorTime.ticks)*100),1)
                'System CPUTime (%)' = [math]::round((($ProcessThread.privilegedProcessorTime.ticks / $ProcessThread.TotalProcessorTime.ticks)*100),1)
                State = $ProcessThread.ThreadState
                'Wait Reason' = $Wait_ReasonPropertyValue
            } 
            $CustomObj = New-Object -TypeName PSObject -Property $Properties
            $CustomObj
        }
    }
}
```

The output looks like this :

```powershell
C:\> Get-ProcessThreadsInfo -ID 10080

System CPUTime (%) : 57.1
ThreadID           : 8760
CPUTime (Sec)      : 0.11
Wait Reason        : The thread is waiting for a user request
User CPUTime (%)   : 42.9
State              : Wait
StartTime          : 27/07/2017 12:37:54

System CPUTime (%) : 0
ThreadID           : 9208
CPUTime (Sec)      : 0.02
Wait Reason        : The thread is waiting for a user request
User CPUTime (%)   : 100
State              : Wait
StartTime          : 27/07/2017 12:37:54

System CPUTime (%) : 0
ThreadID           : 15460
CPUTime (Sec)      : 0.05
Wait Reason        : Waiting for event pair low. Event pairs are used to communicate
                     with protected subsystems
User CPUTime (%)   : 100
State              : Wait
StartTime          : 27/07/2017 12:37:54

System CPUTime (%) : 58.2
ThreadID           : 7428
CPUTime (Sec)      : 2.28
Wait Reason        : The thread is waiting for a user request
User CPUTime (%)   : 41.8
State              : Wait
StartTime          : 27/07/2017 12:37:54

```

This is not exhaustive or deep information by any means, but it can be a starting point to drill down further with other tools.
