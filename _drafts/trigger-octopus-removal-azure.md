---
title: 'Triggering the removal of machines from Octopus Deploy on Azure VM deletion'
tags: [PowerShell, Azure]
excerpt: 'In this post, we take a look at leveraging Azure Automation and Azure Event Grid to ensure that deleting a VM from Azure will automatically trigger the removal of the corresponding machine from Octopus Deploy.'
---

{%- include toc -%}

## The Use Case  

Let's say we use [Octopus Deploy](https://octopus.com/) to standardize our software deployments across all environments.  
These environments, especially the ones used for **development**, **CI/CD**, or **QA** purposes greatly benefit from being managed as transient *cattle* (as opposed to *pets*).  

In a *cattle* mindset, we spin up environments only when they are needed and we tear them down as soon as they are not needed anymore.  
Coupled with automation, this provides **speed**, **consistency**, **self-service** and **cost control**. Even more so if we leverage cloud resources.  

When spinning up environments in Azure, the provisioning of Octopus deployment targets (including registration of Octopus tentacles with the server) can be fully automated with ARM templates and the [Tentacle Azure VM extension](https://octopus.com/docs/infrastructure/windows-targets/azure-virtual-machines/via-an-arm-template).  

This is nice, but the journey from **pet** environments to **cattle** requires the ability to kill our cattle in a quick and painless way. The deletion of resources from Azure is easy to automate but :  
> What about the removal of Octopus deployment targets from the server ?  

The Octopus Tentacle Azure VM extension can register the tentacle with the Octopus server, but **not unregister it**. There is no off-the-shelf solution to automatically trigger the removal of an Octopus machine (i.e. deployment target) when the VM is deleted from Azure.  

So in this article, we'll look at how to do exactly that, by leveraging 2 powerful Azure services :  
  - **Azure Automation** : SASS offering to run and manage scripts, workflows and configuration management  
  - **Azure Event Grid** : enables apps, Azure services, and 3rd-party services to emit and subscribe to notifications  

## Runbook To Remove a Machine From an Octopus Server  

First, we need an Azure Automation account.  
Creating an Automation account is straightforward, as explained in [this documentation page](https://docs.microsoft.com/en-us/azure/automation/automation-quickstart-create-account).  

### Importing the Octoposh PowerShell module Into our Automation Account  

To send commands to our Octopus server, we could write our own calls to the [Octopus REST API](https://octopus.com/docs/api-and-integration/api), but why reinvent the wheel when we can use the excellent [Octoposh](https://github.com/Dalmirog/OctoPosh) module right from Azure Automation ?  

To import the module in our Automation account, select **Modules** and click on **Browse Gallery**. This provides access all the modules from the PowerShell Gallery.  

Search for `Octoposh`, select the search result and then, click on **Import** and **OK**.  

### Adding Variables to Connect to our Octopus Server  

Our runbook will need to connect to the Octopus server. This requires 2 pieces of information :  
  - The server URL  
  - An Octopus API key (for authentication/authorization)  

We'll store these 2 values as variables in our Automation account so that the runbook can easily and securely access them.  

Select **Variables** and click on **Add a variable**.  

Create the following variables :  
  - The server URL :  
    - **Name** : OctopusURL  
    - **Type** : String  
    - **Value** : the URL of our Octopus Deploy server  
    - **Encrypted** : No  
  - Octopus API key :  
    - **Name** : OctopusAPIKey  
    - **Type** : String  
    - **Value** : API key from an account which has **MachineDelete** permission (preferably a service account)  
    - **Encrypted** : Yes  

We are now ready to create the runbook used to remove machines from Octopus.  

### Creating The Runbook To Remove a Machine From Octopus  

Within our Automation account, select **Runbooks** and click on **Add a Runbook**.  
In this case, we name the runbook `Remove-MachineFromOctopusServer` and the runbook type is **PowerShell**.  

As soon as the runbook is created, the Azure portal should switch to the runbook editor.  

Our runbook will contain the following code :  

```powershell
Param(
    [Parameter(Mandatory)]
    [string]$MachineName,

    [Parameter(Mandatory = $False)]
    [string]$OctopusURL = (Get-AutomationVariable -Name 'OctopusURL'),

    [Parameter(Mandatory = $False)]
    [string]$OctopusAPIKey = (Get-AutomationVariable -Name 'OctopusAPIKey')
)

"Machine Name : $MachineName"
"Octopus Server URL : $OctopusURL"

Import-Module -Name 'OctoPosh' -Force
Set-OctopusConnectionInfo -URL $OctopusURL -APIKey $OctopusAPIKey | Out-Null

$OctopusMachine = Get-OctopusMachine -MachineName $MachineName
If ( $OctopusMachine ) {
    $OctopusMachine.Resource
    $Result = Remove-OctopusResource -Resource $OctopusMachine.Resource
    If ( $Result -eq $True ) {
        'The machine has been successfully removed from Octopus.'
    }
    Else {
        $ResultString = $Result | Out-String
        Write-Error $ResultString
    }
}
```

The runbook's parameters deserve some explanation :  
  - `$MachineName` : Value passed from another runbook (more on that later)  
  - `$OctopusURL` : Value read from the `OctopusURL` Automation variable we created earlier  
  - `$OctopusAPIKey` : Value read from the `OctopusAPIKey` Automation variable  

Because we imported the `Octoposh` into our Automation account, its cmdlets are readily available to us when we write runbooks. Here, the module is imported explicitly, but this is only a preference of mine, we could just use PowerShell module auto-loading.  

`Set-OctopusConnectionInfo` is a cmdlet which comes from `Octoposh`.  
The command is piped to `Out-Null` to avoid, *ahem*, having the API key exposed in plain text in the output.  

`Get-OctopusMachine` is used to query the Octopus server for the machine (by name).  
If the machine is present in Octopus, we use `Remove-OctopusResource` (another `Octoposh` cmdlet) to remove it.  

## Runbook To Be Triggered on Azure Resource Deletion  

Now, we are going to create a runbook to listen to Azure resource deletion events in the same subscription as the Automation account. If the resource deleted is a VM, then it will call the other runbook.  


## Adding an Event Subscription  

## Testing The Trigger And Runbooks  

