---
title: Download Podcasts with PowerShell
tags: [PowerShell]
---

A while back, I saw [this article from the Scripting Guy](http://blogs.technet.com/b/heyscriptingguy/archive/2015/05/13/use-windows-powershell-to-parse-rss-feeds.aspx) on parsing RSS feeds.  
Being an avid RSS feeds consumer and podcast watcher/listener, this was a "aha" moment.  

After all, podcasts are basically RSS feeds with a media file attached to each entry.  
So my project was to build PowerShell cmdlets to extract the desired information from podcasts and podcast entries/episodes, and to download them.  

The first version of my **Podcast** module was using `Invoke-WebRequest` for the download of media files. It was quite slow and if there was multiple media files to download, it was not downloading them in parallel.

So, this new version uses <abbr title="Background Intelligent Transfer Service">BITS</abbr> to download the media files via the cmdlet `Start-BitsTransfer`.  

This has many advantages :  
  - It is faster  
  - It allows to start multiple downloads in parallel using the parameter `Asynchronous`  
  - It pauses the download(s) if connectivity is lost and automatically resumes them when it is back  
  - It allows to easily track the progress of download(s) with the property `BytesTransferred` of the `BitsJob` object(s)  

I won't explain the entire code in the module because it would take at least 4 blog articles alone.  
I will just demonstrate the usage of its 4 cmdlets.

## Get-Podcast  

You can give it one or more podcast URL(s) to obtain information on the most recent episodes for the specified podcasts :  

```powershell
C:\> Get-Podcast -Url 'http://feeds.feedburner.com/PowerScripting' -Last 1


PodcastTitle  : PowerScripting Podcast
PodcastUrl    : http://feeds.feedburner.com/PowerScripting
Title         : Episode 320 - PowerScripting Podcast - MVP Tim Warner
Summary       : The PowerScripting Podcast is for people learning Windows PowerShell. In each episode we
                discuss individual cmdlets so you can learn what they do, we bring you news and resources
                about Windows PowerShell to help in your learning. We also bring you tips, tricks,
                one-liners and gotchas that I discover, as well as those submitted by listeners. We talk
                about scripting in PowerShell (and occasionally in VBScript) and ways to make your job "a
                little easier." We have heard PowerShell described as "the future of Windows
                administration" so the time to start learning it is now! Your feedback is always welcome.
                Thanks for subscribing!
Link          : http://feedproxy.google.com/~r/Powerscripting/~3/483AP0Xx2K8/episode-320-powerscripting-podcast-mvp-tim-warner
PublishedDate : 5/17/2017 12:35:33 AM
Author        : {podcast@powershell.org (Jonathan Walz & Hal Rottenberg), Jonathan Walz & Hal Rottenberg}
MediaFileUrl  : http://feedproxy.google.com/~r/Powerscripting/~5/7F6EtkvLaLg/PSPodcast-320.mp3
MediaFileName : PSPodcast-320.mp3
```

It is also possible to send it a bunch of URLs via the pipeline.  

Usually though, I don't manually specify URLs. I give it a file listing all my favorite podcasts as input :  

```powershell
C:\> Get-Podcast -List $env:USERPROFILE\Desktop\PodcastList.txt -FromLastDays 4


PodcastTitle  : RunAs Radio
PodcastUrl    : http://feeds.feedburner.com/RunasRadio
Title         : DevOps for Everyone with Rob England
Summary       : Change is scary, how do you keep people from resisting? While at the DevOps Enterprise
                Summit in London, Richard sat down with fellow Kiwi Rob England to talk about his
                experiences bringing DevOps practices to very conservative organizations - like the New
                Zealand government! The conversation starts out with the idea that DevOps is not just for
                unicorns, that is, companies that are all about leading edge technologies. DevOps works
                for horses too, it just has to be approached the right way.
Link          : http://feedproxy.google.com/~r/RunasRadio/~3/X97-Aqm_aCo/default.aspx
PublishedDate : 7/26/2017 12:00:00 AM
Author        : {Carl Franklin, info@runasradio.com (Richard Campbell and Greg Hughes)}
MediaFileUrl  : http://www.podtrac.com/pts/redirect.mp3/s3.amazonaws.com/runas/runasradio_0542_devops_everyone.mp3
MediaFileName : runasradio_0542_devops_everyone.mp3

PodcastTitle  : Packet Pushers - Datanauts
PodcastUrl    : http://feeds.packetpushers.net/datanauts
Title         : Datanauts 094: Choosing Your Next Infrastructure
Summary       : The Datanauts talk about the pros and cons of alternative infrastructure options
                including converged, hyperconverged and composable infrastructures. Our guest is Fred
                Chagnon.
Link          : http://tracking.feedpress.it/link/16918/6332376
PublishedDate : 7/26/2017 3:03:25 PM
Author        : Chris Wahl, Ethan Banks
MediaFileUrl  : http://tracking.feedpress.it/link/16918/6332377/Datanauts_094_Choosing_Your_Next_Infrastructure.mp3
MediaFileName : Datanauts_094_Choosing_Your_Next_Infrastructure.mp3
```

The parameter `FromLastDays` retrieves only the podcasts published after the specified number of days ago. This is a nice way to check podcasts for updates.  
In this case, I know I was up-to-date on all my favorite podcasts 4 days ago so I use `FromLastDays` to check what is new since then.

By the way, if you want a list of cool tech podcasts, [check out mine](https://github.com/MathieuBuisson/Powershell-Utility/blob/master/Podcast/PodcastList.txt).

## Save-Podcast

It takes the same parameters as `Get-Podcast` with the additional `Destination` which allows to specify where the media file is saved.

```powershell
C:\> Save-Podcast -Url 'http://feeds.packetpushers.net/fullstackjourney' -Last 1
Download of file C:\Full_Stack_Journey_013_Chris_Wahl.mp3 complete
```

The nice part is that you can pipe the output of `Get-Podcast` to `Save-Podcast`.  
So, you can check the output of `Get-Podcast` first, without committing to download.  
Then, if you actually want to download the output podcast episodes, pipe them to ` Save-Podcast` :

```powershell
C:\> Get-Podcast -Url 'http://feeds.packetpushers.net/fullstackjourney/' -Last 1

PodcastTitle  : Packet Pushers - Full Stack Journey
PodcastUrl    : http://feeds.packetpushers.net/fullstackjourney/
Title         : Full Stack Journey 013: Chris Wahl
Summary       : Chris Wahl relates his ongoing Full Stack Journey, including stops along the way for
                PowerShell and Git, as well as the newest directions where his technology compass leads
                him.
Link          : http://tracking.feedpress.it/link/17413/6323394
PublishedDate : 7/25/2017 1:30:01 PM
Author        : Scott Lowe
MediaFileUrl  : http://tracking.feedpress.it/link/17413/6323395/Full_Stack_Journey_013_Chris_Wahl.mp3
MediaFileName : Full_Stack_Journey_013_Chris_Wahl.mp3

C:\> Get-Podcast -Url 'http://feeds.packetpushers.net/fullstackjourney/' -Last 1 |
>> Save-Podcast
Download of file C:\Full_Stack_Journey_013_Chris_Wahl.mp3 complete
```

One limitation when you do it this way : `Save-Podcast` is getting one media file at a time through the pipeline, so the downloads are sequential, not in parallel.  

This also means that the count of files and the total size displayed by `Write-Progress` are incorrect.
The count of files is always 1 when using pipeline input. If you have a solution for this, I am all hears.

## Add-PodcastToList

This allows to add podcast URLs to the file containing your favorite podcasts, without having to manually edit the file.  
It can also create a list of podcasts because if the file specified doesn't exist, it creates it :

```powershell
C:\> Add-PodcastToList -Url http://feeds.feedburner.com/PowerScripting -List $env:USERPROFILE\Desktop\MyPodcastList.txt
```

You can also use this cmdlet in combination with `Get-Podcast` to create a new podcast list from an existing list :

```powershell
C:\> $Last30Days = Get-Podcast -List 'C:\GitHub\Powershell-Utility\Podcast\PodcastList.txt' -FromLastDays 30
C:\> $EpisodesAboutDevOps = $Last30Days | Where-Object Summary -Match 'DevOps'
C:\> $EpisodesAboutDevOps | Add-PodcastToList -List $env:USERPROFILE\Desktop\DevOpsPodcasts.txt


    Directory: C:\Users\mathieu\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----        7/29/2017   5:14 PM              0 DevOpsPodcasts.txt
```

As you can see above, I got podcasts from my main podcast list selecting only the episodes from the last 30 days because I don't need a huge number of episodes.  
 
Then, I filter down to the episodes which have the word "DevOps" in their `Summary` field and I add the `PodcastUrl` from these episodes to a new list.

Don't worry if multiple episodes of the same podcast match the filter, `Add-PodcastToList` will not result in duplicates, because it checks if the destination list already contains the URL before adding it.

## Remove-PodcastFromList

This cmdlet allows to remove podcast URLs from a podcast list, without having to manually edit the file :

```powershell
C:\> $PodcastToRemove = 'http://s.ch9.ms/Shows/Defrag-Tools/feed/mp4high'
C:\> $PodcastList = "$env:USERPROFILE\Desktop\PodcastList.txt"
C:\> Remove-PodcastFromList $PodcastToRemove $PodcastList
```

Here, we are using positional parameters, the `Url` parameter is at position 0 and the `List` parameter is at position 1.

Podcasts can come and go, or some podcasts can be a series on a specific topic and are not updated after the series is finished. You can use `Remove-PodcastFromList` to cleanup stale podcasts from a list, like so :

```powershell
C:\> $LastEpisodeAll = Get-Podcast $PodcastList -Last 1
C:\> $DeadPodcasts = $LastEpisodeAll | Where-Object PublishedDate -lt (Get-Date).AddMonths(-8)
C:\> $DeadPodcasts | Remove-PodcastFromList -List $PodcastList
```

This obtains the last episode of each podcast in the list, then it filters down to the episodes older than 8 months ago.  
We assume that if the latest episode is more than 8 months old, the podcast is probably finished or abandoned, so we remove it from the list.

That's pretty much all there is to using the **Podcast** module.  
It is available for grabbing and/or improving in [this GitHub repository](https://github.com/MathieuBuisson/Powershell-Utility/tree/master/Podcast).
