---
title: 'Using Azure Monitor Workbooks to document your Azure resources'
tags: [Azure]
excerpt: 'In this post, we show how to build an Azure resources inventory report, which is reusable for any Resource Group. Then, we share the workbook to make it available to colleagues and other stakeholders.'
header:
    teaser:
---

{%- include toc -%}

## The Problem

Azure makes it very easy to deploy resources in various ways and contexts :

-   deployed by humans or automated processes
-   run/managed by different teams
-   to support different applications/workloads
-   billed to different cost centers or subscriptions
-   in different geographical locations
-   in different environments/purposes (dev, QA, staging, production...)

It is **so easy** to spin up resources that, without appropriate governance, this can quickly lead to **resource sprawl**.  
An aspect of Azure governance which is often overlooked is :

> Which resources are running and where ?  
> What is the type, configuration, SKU of these resources ?

In other words, how do we build and document an **inventory of Azure resources** ?  
Sure, this can be done in a Confluence page or any kind of wiki, but as resources and entire environments are being created, modified, deleted by different teams and processes, how can we keep this documentation up-to-date ?

Any document which relies on human intervention is unlikely to keep up with the rate and variety of change, and it will eventually become stale.

A solution is to build a self-updating report about the Azure resources we have running, regardless of how/why they were provisioned and the Azure region and subscription in which they are located.

## Introducing Azure Monitor Workbooks

**[Azure Workbooks](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/workbooks-overview)** is a service which allows to build reports using text (in markdown) and a number of data visualization types (tables, charts, tiles, etc...). The data can come from various sources (logs, metrics, alerts, etc...) and is obtained using <abbr title="Kusto Query Language">KQL</abbr> queries.

As its name implies, this service lives under the **Azure Monitor** umbrella and it is typically used to create reports like :

-   performance analysis
-   incident reviews
-   troubleshooting guides

But because **Azure Monitor Workbooks** can also run <abbr title="Kusto Query Language">KQL</abbr> queries against the **[Azure Resource Graph](https://azure.microsoft.com/en-us/features/resource-graph/)**, we can also use it to build an inventory of our Azure resources.

**Azure Monitor Workbooks** provides templates readily available in the portal, to get started quickly. The built-in templates cover a good number of scenarios, but not for our specific use case, so **we are going to create a workbook from scratch**.

This workbook will enable us to gather a few relevant properties on the following types of resources, across **all environments** and **all subscriptions** :

-   App Services
-   SQL Databases
-   Virtual Machines
-   Automation Runbooks
-   Redis Cache

Let's do this.

## Creating the Workbook Resource

1. In the Azure Portal, go to the **Monitor** service
2. In the **Monitor** menu click on **Workbooks**
3. From here, we can view the built-in templates, but in our case, we select **Empty** :

    ![Empty]({{ "/images/2020-01-02-azure-workbooks-inventory-resources-empty.png" | absolute_url }})

We add an introductory section for the report, just to have some content to save.

1. Click on **Add text**
2. Add the following markdown :

    ```md
    # Environments Inventory

    ⚠️ _Select a **Resource Group** in the drop-down below_
    ```

    The first line acts as the report title. The second line is a note on how to interact with the report (more on that later).

3. Click on **Done Editing**
4. Verify that the rendered markdown displays as expected in the report

Now, we save the report as a **workbook** resource.

1. Click on the **Save As** button
2. Fill out the following fields :

    - **Title** : This is the user-friendly name of the workbook
    - **Subscription** : The Azure subscription where we want to save the workbook resource
    - **Resource group** : The resource group where we want to save the workbook resource.  
      Make sure that users and stakeholders who need to view this inventory report have at least the **Reader** role on this resource group.
    - **Location** : It defaults to the location of the destination resource group.  
      I would recommend to leave it that way.
    - **Save To** : After selecting a resource group, we have the ability to choose **Shared reports**.  
      This is what we want, in order to make our report available to others.

3. Click on **Save**

    Now, if we go to the destination resource group, we can see the corresponding resource :

    ![Workbook resource]({{ "/images/2020-01-02-azure-workbooks-inventory-resources-resource.png" | absolute_url }})

    **Note:**  
    Clicking on this resource merely provides access to the resource metadata.  
    To view or edit the workbook, we need to access it from **Azure Monitor**.
    {: .notice--info }

4. In the Azure Portal, go back to the **Monitor** service
5. You should see the saved workbook in **Recently modified workbooks** :

    ![Recently modified]({{ "/images/2020-01-02-azure-workbooks-inventory-resources-recently.png" | absolute_url }})

6. Click on the saved workbook to open it
7. Click on the **Edit** button to switch to editing mode

Next, we are going to flesh out our Azure resources inventory report.

## Building the Report

In our scenario, Azure environments have a 1-to-1 relationship with a resource group and these resource groups follow a basic naming convention :  
`{Environment_Type}-corp-{Environment_Location}`

For example, the resource groups names are :

-   dev-corp-europe
-   dev-corp-us
-   test-corp-us

In the workbook, we want the user to be able to interactively choose which environment to inventory.  
We can do that using a parameter.

### Parameterizing the Report

1. Click on **Add parameters**
2. Click on **Add parameter** on the top left corner on the section editing box
3. Specifiy the parameter properties like so :

    ![Parameter]({{ "/images/2020-01-02-azure-workbooks-inventory-resources-parameter.png" | absolute_url }})

    Some of these fields warrant an explanation.

    - **Parameter type** : The type of UI to allow the user to specify a value for this parameter.
      In this case, we want a drop down menu.
    - **Get data from** : Where the possible values in the drop down menu should come from.  
      This can be static data ( a JSON array), or dynamic data (based on a <abbr title="Kusto Query Language">KQL</abbr> query).  
      In this case, it is based on a query, since we are going to query the **Azure Resource Graph** to get a list of resource groups.
    - **Data source** : Azure Resource Graph
    - **Subscriptions** : Use all subscriptions, unless you want to restrict this query to specific subscriptions.

        **Warning:**  
         All <abbr title="Kusto Query Language">KQL</abbr> queries in a workbook run whenever we interact with the workbook.  
         They are run under the credentials of whoever is viewing the workbook, so they return only resource groups and resources that the user has access to (at least **Read** permission).
        {: .notice--warning }

    - **The actual query** :

        **Note:**  
         While teaching <abbr title="Kusto Query Language">KQL</abbr> is out of scope for this article, we are going to expand on some noteworthy elements of the queries, just so we understand what is happening.  
         For more information on <abbr title="Kusto Query Language">KQL</abbr>, please refer to **[the documentation](https://docs.microsoft.com/en-us/azure/kusto/query/)**.
        {: .notice--info }

        This query gets all the resource groups, then it filters them based on our naming convention.  
         Then, we `project` their `name` property, because this is the only property we need for the drop down menu items.

4. Click **Save** to save the settings for this parameter
5. Click **Done Editing**

Now, we can test the UI for this parameter :

![dropdown]({{ "/images/2020-01-02-azure-workbooks-inventory-resources-dropdown.png" | absolute_url }})

### Adding a Section for App Services

We start off with a short text block, containing the section title and a bit of usage information.

1. Click on **Add text**
2. Add the following markdown :

    ```md
    ## App Services :

    💡 _Click on a resource name to go to the resource in the portal, or click on a URL to go to the web app in your browser._
    ```

3. Click on **Done Editing**

Now, we gather the data we need regarding the Azure App Services (in the selected resource group) and present the data in a table.

1. Click on **Add query**
2. Change the **Data source** to **Azure Resource Graph**
3. For **Subscriptions**, select **Use all Subscriptions**
4. Leave **Visualization** and **Size** at their default value
5. In the query text box, add the following query :

    ```
    Resources
    | where resourceGroup == '{ResourceGroupeName}'
    | where type == 'microsoft.web/sites'
    | project ["Web App"] = id,
      ["App Service Plan"] = tostring(properties.serverFarmId),
      Kind = kind,
      URL = strcat("https://", properties.defaultHostName),
      ["SKU Name"] = properties.sku
    ```

    Remember our `ResourceGroupeName` parameter ?  
    The second line above shows how to reference the value of this parameter from queries in the workbook.

    In this section we are only interested in **App Services**, so we filter on the type `microsoft.web/sites`.

    Then, we use `project` to define the columns we want. We have to use square brackets and quotes whenever a column name contains spaces.

    As you might have guessed, `strcat()` is a function which allows to concatenate 2 or more strings. Here, we use it to derive the web app URL from its **defaultHostName** property.

6. Click **Done Editing**

    We can now admire the result of our query :

    ![App Services Table]({{ "/images/2020-01-02-azure-workbooks-inventory-resources-appservices-table.png" | absolute_url }})

    Note that values in the **Web App** and **App Service Plan** columns are automatically displayed as links and clicking on any of these brings us to the underlying resource in the Azure Portal.  
    Unfortunately, this is not the case for the **URL** column. But we can easily remediate that.

7. Click the **Edit** button at the bottom right of the App Service table
8. Click on **Column Settings**
9. Select the **URL (Automatic)**
10. Set **Column renderer** to **Link**
11. Set **View to open** to **Url**
12. Click **Save and Close**

Now, we can browse to the actual application by clicking on its URL value in the table.

### Adding a Section for SQL Databases

We start off with a short text block, containing the section title and a bit of usage information.

1. Click on **Add text**
2. Add the following markdown :

    ```md
    ## SQL Databases :

    💡 _Click on a resource name to go to the resource in the portal_
    ```

3. Click on **Done Editing**

Now, we gather the data we need regarding the Azure SQL Databases (in the selected resource group) and present the data in a table.

1. Click on **Add query**
2. Change the **Data source** to **Azure Resource Graph**
3. For **Subscriptions**, select **Use all Subscriptions**
4. Leave **Visualization** at its default value
5. Set **Size** to **Small**, unless you have about 6 or more databases
6. In the query text box, add the following query :

    ```
    Resources
    | where resourceGroup == '{ResourceGroupeName}'
    | where type == 'microsoft.sql/servers/databases'
    | where name != 'master'
    | project Database = id,
      ["Elastic Pool"] = tostring(properties.elasticPoolId),
      ["SKU Name"] = sku.name,
      ["Pricing Tier"] = sku.tier,
      Status = properties.status
    ```

    In this section we are interested in **SQL Databases**, this is why we filter on the type `microsoft.sql/servers/databases`.  
    We filter out the **master** database because it is not relevant to our applications.

    Then, we use `project` to expose the database properties we want and define the table's columns.

7. Click **Done Editing**

The resulting table might not look as cute as Baby Yoda, but still looks pretty nice :

![SQL Databases]({{ "/images/2020-01-02-azure-workbooks-inventory-resources-databases-table.png" | absolute_url }})

Again, the **Database** and **Elastic Pool** columns allow us to browse to the underlying resource in the portal, since their values are displayed as links.

### Adding a Section for Virtual Machines
