---
title: 'Triggering the removal of machines from Octopus Deploy on Azure VM deletion'
tags: [PowerShell, Azure]
---

{%- include toc -%}

When spinning up environments in Azure, the provisioning of Octopus deployment targets (including the registration of the Octopus tentacle with the server) can be fully automated with ARM templates and the [Tentacle Azure VM extension](https://octopus.com/docs/infrastructure/windows-targets/azure-virtual-machines/via-an-arm-template).  

This is nice, but the journey from **pet** environments to transient **cattle** requires the ability to kill our cattle in a quick, painless and therefore automated way.  
In this *cattle* world where we spin up and tear down environments as needed, we could quickly end up with **many** stale machines in Octopus.  

The Octopus Tentacle Azure VM extension can register the tentacle with the Octopus server, but **not unregister it**. There is no off-the-shelf solution to automatically trigger the removal of an Octopus machine (i.e. deployment target) when the VM is deleted from Azure.  

So in this article, we'll look at how to do exactly that, by leveraging 2 powerful Azure services :  
  - Azure Automation  
  - Azure Event Grid  


## Azure Automation Runbook To Remove a Machine From an Octopus Server  

First, we need an Azure Automation account.  
To create one, search for `automation accounts` in the Azure portal, click on **Automation Accounts** in **Services**, click on **Add** and follow the simple wizard.  

Within the automation account, select **Runbooks** and click on **Add a Runbook**.  
In this case, we named the runbook `Remove-MachineFromOctopusServer` and the runbook type is **PowerShell**.  



## Azure Automation Runbook To Be Triggered on Azure Resource Deletion  

## Adding an Event Subscription To The Automation Account  

## Testing The Trigger And Runbooks  

