---
title: Where to start your automation efforts ? An analogy for IT infrastructure folks
tags:
  - DevOps
  - Performance
---

Nowadays, many IT shops look a lot like the first few pages of [The Phoenix Project](http://itrevolution.com/books/phoenix-project-devops-book/) : lack of automation and communication which leads to manual and unpredictable deployments, which in turn, leads to firefighting.  

Fortunately, many of these shops are starting to understand the value of implementing some of the DevOps principles.

Of all the DevOps principles, automation is the one where the return on investment is the most obvious so that's where most IT organisations start. I'm not saying this is the best starting point, but this is the most typical starting point of a DevOps journey.  

At this point, IT folks who are traditionally infrastructure-focused are asked to move their focus "up-the-stack" and towards automation.  
This is a difficult shift to make, especially for those who are not willing to adapt and learn new skills.  
But even for those who are willing to make that shift, it can be confusing.  

> OK, I'm going to automate stuff, but where do I start ?  
> What should I automate first ?  

I'll attempt to answer that question drawing on my 8 years of hard-learned lessons in IT support and using a metaphor that most infrastructure-focused IT folks can relate to.  

## Storage performance troubleshooting :  

Users are complaining that a specific application is "very slow", so you go and check the resources usage for the virtual machine running that particular application. You notice frequent storage latency spikes of up to 3 seconds !  

Now, you need to identify **where this latency is coming from**.  
It is easier said than done, storage infrastructure is complex, especially SAN-based storage.  
The latency can come from many different areas :  
  - Within the virtual machine (or the application)  
  - At the hypervisor layer  
  - The SAN fabric (cables and switches)  
  - The storage array  

Ultimately, whatever the transport protocol, it boils down to encapsulated SCSI commands. So you need to consider the storage system as a whole and try to picture it as a pipeline transporting SCSI commands from a VM to a disk.  
Any component which is struggling to keep up will eventually slow down the entire pipeline. Why ?

The SCSI commands, or frames, or packets, or whatever the unit of work is at this stage, are going to be stored in the queue of the struggling component. And what happens when the struggling component's queue is full ?  
The queue of another component, located upstream in the pipeline, starts to fill up. In the meantime, any component located downstream in the pipeline is left with no work to do. Waiting...

So you need to check the latency metrics at each components in the pipeline and single out which one introduces the most latency : **the bottleneck**.  
It's not always obvious and sometimes the victim can be confused with the culprit, but that's where your expertise comes in. That's why you are paid the big bucks, right ?

Let's say you have identified the latency introduced in each areas, like so :  
  - Virtual machine : 10 milliseconds  
  - Hypervisor : 25 milliseconds  
  - SAN fabric : 50 milliseconds  
  - Storage array : varies a lot, up to almost 3 seconds  

Now, if you reduce the latency at the storage array level by 2 seconds, how much latency improvement are you going to see on the whole storage system end-to-end ?  

2 seconds.
{: .notice--success }  

If you reduce the latency the SAN fabric level by 30 milliseconds, how much latency improvement are you going to see on the overall storage system ?  

Basically, none.
{: .notice--danger }  

This seems quite obvious but this is to emphasize a very important point : the energy, time and **resources spent on anything else than the bottleneck are 100% waste**.  

So where do you start ? You identify the bottleneck and focus all your efforts on improving the performance of that component.

After further investigation, it turns out there was 2 dead disks in the RAID set where the virtual machine was stored. You replace the 2 disks and now the latency at the storage array level is only 30 milliseconds.  

That's great, you have eliminated the first bottleneck, but now you have new one : the SAN fabric.  
In any pipeline, at any given time, there is 1 (and only 1) bottleneck. So now, you can focus all your efforts on the fabric, unless the current performance is acceptable for your application(s).

This is in a nutshell how to prioritize performance improvements in a storage system, but what the hell does it have to do with automation ?  
Everything.

## IT service delivery as a pipeline :  

The *Lean* thinking (and all the stuff that came from it, like *Agile*) originated from applying the principles of *Lean manufacturing* (pioneered by Toyota) to the software industry.  
It compares a software delivery pipeline with a manufacturing assembly line. This is a very powerful analogy and many fascinating learnings have been drawn from it.  

If you are not convinced, I suggest you read this : [Lean Software Development: An Agile Toolkit](https://www.amazon.com/Lean-Software-Development-Agile-Toolkit/dp/0321150783/).

With the emergence of *DevOps* and *Lean IT*, some people started to realize that it can be applied to IT operations as well. IT service delivery can be considered as a pipeline, much like a storage system.  
It transports a continuous flow of **tickets, feature requests, change requests, or work items** instead of SCSI commands, frames or packets.  
The destination of the services it delivers is users, instead of a disk.

The components involved in the different stages along the pipeline vary a lot depending on the type and scope of the request :  
  - Application team  
  - Systems Operations team  
  - Network team  
  - Storage team  
  - Security team  
  - QA  

It can be potentially be very complex, but you need an exhaustive list of **all the parts** involved in the pipeline, even outside of IT.   
This requires to take a step back from your IT bubble and look at the bigger picture. It is very important to have a holistic view of "the system".

This mental model of a pipeline allows to *troubleshoot* the performance of your IT service delivery.  
Just like any pipeline, the 2 main ways to measure performance are :  
  - **Throughput** : amount of work that can go through the pipeline in a given amount of time  
  - **Latency** : the time it takes for a single unit of work to go through the pipeline  

Similarly to most storage admins, *Agile* and *DevOps* tend to focus more on latency as a performance indicator.  
Agile talks a lot about *velocity* and DevOps uses the term *lead times*. So again, you need to determine the latency at each stage of the IT service delivery pipeline and identify the component which adds the most latency : **the bottleneck**.

Like in a storage infrastructure, bottlenecks tend to manifest themselves as a queue filling up with work in progress.  
But this work waiting to be processed is not often obvious in the context of IT services, because you cannot touch it (except for hardware). You can easily see car parts piling up in a warehouse, but can you see the 1s and 0s piling up ?  

A nice way to make work more visible is to use tools like [Kanban boards](https://en.wikipedia.org/wiki/Kanban_board).  

When the bottleneck is identified, you know where to focus your efforts.  
Not just automation efforts, **ALL** efforts should be focused on addressing the bottleneck. Yes, automation may only be part of the solution and in some cases, it might even be a small part. This is because technology may only be a small part of the problem.  

The bigger problem may very well be lack of communication, or lack of skills, overly complex processes, etc...  
This means your automation efforts need to be integrated into a broader effort to eliminate the bottleneck. It is about IT and *the business* **working together** towards a common goal.

When the latency of the struggling component in the IT service delivery pipeline has been reduced enough to relieve the bottleneck, you know that you have improved **the performance of your entire IT organization**, and by how much.  

By the way, this information can come in handy for your next pay review.
{: .notice--info }  

After that, you can move on and focus all your energy on the next bottleneck.

So there is no recipe but hopefully, this article provides some guidance on how to prioritize automation efforts. It is very much about optimizing the impact by focusing on **relieving the most crippling pain your IT organization has**, and by doing so, making yourself more valuable.

If you want more on these topics, here is [a pretty deep perspective](https://keepingitclassless.net/2016/10/principles-of-automation/) on automation, infrastructure (networking in this case) and bottlenecks.
