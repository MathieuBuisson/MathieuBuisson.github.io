---
title: 'Making Azure infrastructure code more composable and maintainable with Terraform modules'        
tags: [Azure, Terraform]
excerpt: 'In this post, we show how to make Azure "Infrastructure as Code" more concise and modular. We take an ARM template from the QuickStart Templates repo, we break it down into small, tightly focused units and we combine them as a Terraform configuration'
header:
  teaser:
---

{%- include toc -%}

## The Problem

### Modeling complex infrastructure with a declarative DSL

There are a number of **[issues and limitations with Azure ARM templates](https://pascalnaber.wordpress.com/2018/11/11/stop-using-arm-templates-use-the-azure-cli-instead/)**, and to be fair, many of them are not specific to ARM templates but pertain to declarative <abbr title="Domain Specific Languages">DSLs</abbr> in general.  

The first and most painfully obvious issue with declarative <abbr title="Domain Specific Languages">DSLs</abbr> is their limited support for **logic**. Constructs which are trivial in any general purpose programming language (iteration, conditions, etc...) tend to be clunky and limited in <abbr title="Domain Specific Languages">DSLs</abbr>.  

> Have you ever tried a `if {...} elseif {...} else {...}` in a YAML-based DSL ?

> How about populating an array variable from the iteration over another array variable, in an ARM template ?

It is feasible, but :  
  - Is the syntax clean and readable ?
  - Is it properly explained in the documentation (with examples) ?
  - Is it easy to debug when it blows up in your face ?

I'll let you answer that yourselves.  

In some cases, we can get away with not using any logic and stick to a purely declarative approach, but this implies one of 2 things :  
  - The scenario is very simple
  - It's a trade-off with **<abbr title="Don't Repeat Yourself">DRY</abbr>** and may result in **CPDD** (Copy Paste Driven Development)

YAML and JSON were intended as data serialization formats, not to represent complex infrastructure stacks, and that is the root of this problem ([eloquently explained here](https://blog.atomist.com/in-defense-of-yaml/)).  

### Large monolithic ARM templates

It is not uncommon for Azure ARM templates to grow to 500, 600, or even 1000+ lines. Don't take my word for it, just browse the **[Azure Quickstart Templates repo](https://github.com/Azure/azure-quickstart-templates)**.  

There are 2 main reasons for that :  
  - The ARM template syntax is quite verbose
  - Splitting large templates into smaller ones is not always possible or easy

Sure, we can use [linked templates](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-linked-templates), but the only way to specify a linked template is a URL, and it has to be publicly accessible.  

Many coding standards, in any programming language have guidelines in terms of lines code per function, method, class, or file. A basic principle is :  
> To be easy to read and understand, it should fit into a screen

This is definitely not the case with most ARM templates, we often scroll down, and up, and down again... to understand what is going on.  

This also impacts dev workflow/collaboration because some source management tools may not display the diffs for such long files. This makes reviewing pull requests more complicated than it should be.  

In most programming contexts, **we would never tolerate such large and monolithic code**, so should we tolerate this for our infrastructure code ?  

I don't think so.  
So let's see how **[Terraform](https://www.terraform.io/)** can help, with an example based on this ARM template :  
**[201-jenkins-acr](https://github.com/Azure/azure-quickstart-templates/tree/master/201-jenkins-acr)**  

## Breaking Down the Problem Into Smaller Parts

**Decomposition** is a crucial aspect of Software Engineering (and problem-solving in general). It is the practice of breaking a problem down into smaller parts to make it easier to tackle.  

This manifests in code organized in units, which have clear, logical boundaries and which are named to express their purpose. These units of code can be functions, or classes in object-oriented languages.  
In **Terraform**, these units are **modules**.  

> How do we decide where to split the code ?  
> In other words, how do we define the boundaries of our Terraform modules ?

### A module should have a single purpose, or a clear focus

This is typically reflected in the module's naming. If we find it hard to find a meaningful and concise name for our module, this is a sign that the module may be doing more than 1 thing.  

Our example template defines the following resources :  
  - A storage account
  - An Azure container registry
  - Network-related resources (virtual network, subnet, NSG, etc.)
  - A Linux VM where we run Jenkins

At the most basic level, a **Terraform** module is just a directory with a bunch of `.tf` files. So the way we split our code into modules should manifest in the directory structure of the repo. Here is what it looks like :  

```powershell
C:\git\tf-jenkins-acr
├───.vscode
└───modules
    ├───acr
    ├───jenkins
    ├───networking
    └───storage
```

Inside the `modules` directory, each folder is a module.  
They all have a single-word name, which is an indication that they have a single purpose. Also, these names are reasonably explicit to convey the module's responsibility.  

By the way, all the code we are talking about here is available **[in this GitHub repository](https://github.com/MathieuBuisson/tf-jenkins-acr)**.  

### A module should be generic enough to allow for reuse

A **Terraform** module is only a part of a solution to a particular problem, and it is likely that the problem may change in the future. So, when designing a module, we should try to think about what is likely to change, and what is unlikely to change.  

Then, having determined the appropriate level of flexibility for our context, we can decide what can be hard-coded and what should be parameterized.  

For example in the storage account definition of the original ARM template, almost everything is hard-coded :  

```json
    {
      "type": "Microsoft.Storage/storageAccounts",
      "name": "[variables('acrStorageAccountName')]",
      "apiVersion": "2016-01-01",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "Storage",
      "properties": {
        "encryption": {
          "services": {
            "blob": {
              "enabled": true
            }
          },
          "keySource": "Microsoft.Storage"
        }
      }
    }
```

To make this into something which can adapt easily to future requirements or even different scenarios, the `storage` module has everything parameterized :  

```javascript
resource "azurerm_storage_account" "sa" {
  name                      = "${var.storage_account_name}"
  resource_group_name       = "${var.resource_group_name}"
  location                  = "${var.location}"
  account_tier              = "${var.storage_account_tier}"
  account_replication_type  = "${var.storage_replication_type}"
  account_kind              = "${var.storage_account_kind}"
  enable_blob_encryption    = "${var.blob_encryption}"
  enable_file_encryption    = "${var.file_encryption}"
  account_encryption_source = "${var.encryption_key_source}"
}
```

{% capture notice-var-text %}
`${var.*}` is **Terraform** interpolation syntax to get variable values. *Variables* are more accurately described as the module's **input parameters**.
{% endcapture %}

<div class="notice--info">
  <h4>Note :</h4>
  {{ notice-var-text | markdownify }}
</div>

To avoid having to specify values for these variables when using the module, but keep the flexibility to specify values whenever we want to, we populate the `variables.tf` file with default values :  

```javascript
variable "storage_account_name" {
  description = "Name of the storage account"
  type        = "string"
}

variable "resource_group_name" {
  description = "Name of the resource group where the storage account belongs"
  type        = "string"
}

variable "location" {
  description = "Azure region where the storage account will be located"
  type        = "string"
}

variable "storage_account_tier" {
  description = "Tier to use for this storage account. Valid values are : 'Standard' and 'Premium'."
  default     = "Standard"
}

variable "storage_replication_type" {
  description = "Type of replication to use for this storage account. Valid values are : 'LRS', 'GRS', 'RAGRS' and 'ZRS'."
  default     = "LRS"
}

variable "storage_account_kind" {
  description = "Kind of storage account. Valid values are : 'Storage', 'StorageV2' and 'BlobStorage'."
  default     = "Storage"
}

variable "blob_encryption" {
  description = "Whether Encryption Services should be enabled for Blob storage"
  default     = true
}

variable "file_encryption" {
  description = "Whether Encryption Services should be enabled for file storage"
  default     = false
}

variable "encryption_key_source" {
  description = "Encryption key source for the storage account. Valid values are : 'Microsoft.Keyvault' and 'Microsoft.Storage'."
  default     = "Microsoft.Storage"
}
```


### A module should group tightly coupled resources together

When considering where to set modules boundaries, we should take into account dependencies between resources.  
This means we should try to group dependent resources in the same module as much as possible/practical.  

In our example ARM template, the subnet resource is tightly coupled with the virtual network resource (it's even nested into it). And then, the subnet resource is associated with both the network interface and the network security group.  

To make this dependency chain easier to manage, we group these resources in the `networking` module. In this module, there is a nice example of how a resource can reference other resources from the same module:  

```javascript
resource "azurerm_subnet_network_security_group_association" "nsglink" {
  subnet_id                 = "${azurerm_subnet.subnet.id}"
  network_security_group_id = "${azurerm_network_security_group.nsg.id}"
}
```

Here, we define a `azurerm_subnet_network_security_group_association` resource which depends on a subnet resource and a network security group. The interpolation syntax to reference another resource is : `resource_type.resource_instance_name.attribute`.  

### A module should be loosely coupled with other modules

If multiple modules are used as part of the same overall solution, there will be cases where a resource from a module needs to reference a resource from another module. This **inter-module coupling should be loose**.  

What this means is that **Terraform** modules should not have direct knowledge of other modules. Instead, they take their dependencies via **input parameters** (i.e. variables) and they expose information needed by other modules via **outputs**.  

In our example scenario, the `jenkins` module needs to know the login server name of the Azure container registry, to be able to configure Jenkins to push to this registry. So the `acr` module exposes this information via its `login_server` output :  

```javascript
output "login_server" {
  value = "${azurerm_container_registry.acr.login_server}"
}
```

This information is *returned* to the caller (root module or **Terraform** configuration) and accessible via the interpolation syntax `module.module_name.output_name`, like so :  

```javascript
module "jenkins" {
  ...
  ...

  registry_login_server    = "${module.acr.login_server}"
  ...
  ...
}
```

Then, the caller passes this value to the `jenkins` module via its `registry_login_server` parameter.  
This parameter is defined in the `jenkins` module as a variable, like so :  

```javascript
variable "registry_login_server" {
  description = "URL to specify to login to the container registry"
  type        = "string"
}
```

In this arrangement, the `jenkins` module doesn't need to know where this information comes from.  
Similarly, the `acr` module doesn't need to know what is consuming its outputs, or even, whether its outputs are being used at all.  

## Composing a Solution For the Overall Problem

When we are done splitting our **Infrastructure as Code** template into smaller, primitive building blocks, and each one of these is responsible for its own specific concern, it's time to tie them together to form an overall solution.  

To that end, we write a **Terraform** configuration which calls the modules and combines them together by accessing their outputs and passing them to other module's parameters as needed.  

{% capture notice-root-text %}
As alluded to earlier, this **Terraform** configuration can also be called a *"root module"*. This is not really different, since a module is just a directory with a bunch of `.tf` files.
{% endcapture %}

<div class="notice--info">
  <h4>Note :</h4>
  {{ notice-root-text | markdownify }}
</div>

In our case, this refers to the `.tf` files located at the root of the repository :  

```powershell
PS C:\> dir *.tf

    Directory: C:\git\tf-jenkins-acr

Mode                LastWriteTime     Length Name
----                -------------     ------ ----
-a----       23/04/2019     09:51       2666 main.tf
-a----       23/04/2019     09:51        294 outputs.tf
-a----       23/04/2019     09:51        330 providers.tf
-a----       23/04/2019     09:51       1807 variables.tf
```

The main file (as its name implies) is the `main.tf`, as this is the one which defines all resources. Actually, it doesn't define resources directly, it does so **indirectly** by invoking the modules which take care of managing their own set of resources.  

So here is our newly modularized **Infrastructure as Code** solution (`main.tf`):  

```javascript
resource "random_string" "suffix" {
  length  = 10
  upper   = false
  special = false
}

locals {
  resource_prefix              = "jenkins"
  resource_suffix              = "${random_string.suffix.result}"
  default_storage_account_name = "registry${local.resource_suffix}"
  storage_account_name         = "${var.storage_account_name != "" ? var.storage_account_name : local.default_storage_account_name}"
  default_acr_name             = "acr${local.resource_suffix}"
  acr_name                     = "${var.registry_name != "" ? var.registry_name : local.default_acr_name}"
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.resource_group_name}"
  location = "${var.location}"
}

module "storage" {
  source               = "./modules/storage"
  storage_account_name = "${local.storage_account_name}"
  resource_group_name  = "${azurerm_resource_group.rg.name}"
  location             = "${azurerm_resource_group.rg.location}"
  storage_account_tier = "${var.storage_account_tier}"
}

module "acr" {
  source              = "./modules/acr"
  registry_name       = "${local.acr_name}"
  resource_group_name = "${azurerm_resource_group.rg.name}"
  location            = "${azurerm_resource_group.rg.location}"
  storage_account_id  = "${module.storage.storage_account_id}"
}

module "networking" {
  source              = "./modules/networking"
  public_ip_name      = "${local.resource_prefix}-publicip"
  resource_group_name = "${azurerm_resource_group.rg.name}"
  location            = "${azurerm_resource_group.rg.location}"
  public_ip_dns_label = "${var.jenkins_vm_dns_prefix}"
  nsg_name            = "${local.resource_prefix}-nsg"
  vnet_name           = "${local.resource_prefix}-vnet"
  subnet_name         = "${local.resource_prefix}-subnet"
  nic_name            = "${local.resource_prefix}-nic"
}

module "jenkins" {
  source                   = "./modules/jenkins"
  vm_name                  = "${var.jenkins_vm_dns_prefix}"
  resource_group_name      = "${azurerm_resource_group.rg.name}"
  location                 = "${azurerm_resource_group.rg.location}"
  nic_id                   = "${module.networking.nic_id}"
  vm_size                  = "${var.vm_size}"
  admin_username           = "${var.admin_username}"
  admin_password           = "${var.admin_password}"
  public_ip_fqdn           = "${module.networking.public_ip_fqdn}"
  git_repository           = "${var.git_repository}"
  registry_login_server    = "${module.acr.login_server}"
  service_principal_id     = "${var.service_principal_id}"
  service_principal_secret = "${var.service_principal_secret}"
}
```

The `locals` block is not necessary but it is a flexible way of setting a default naming convention for resources, if names are not specified via input variables.  

The only resource which is defined directly from here is the resource group, everything else is done by the modules.  

This is **63 lines** of code, which is a pretty massive improvement over the original ARM template (**294 lines**). This means reading (and more importantly, understanding) what is going on in this configuration requires much less scrolling.  

Also, the fact that this is now split into smaller pieces and that everything is parameterized, makes it easier to maintain and **more adaptable to changing requirements** (and remember, the only constant is change).  

Again, the code is **[here](https://github.com/MathieuBuisson/tf-jenkins-acr)**.  
Feel free to take a look at it, get an understanding of how the parts fit together, and since this is a **working** example, you can even try it for yourselves.  
