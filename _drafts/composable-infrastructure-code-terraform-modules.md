---
title: 'Making Azure infrastructure code more composable and maintainable with Terraform modules'        
tags: [Azure, Terraform]
excerpt: 'In this post, we show how to make Azure "Infrastructure as Code" more concise and modular. We take an ARM template from the QuickStart Templates repo, we break it down into small, tightly focused units and we combine them as a Terraform configuration'
header:
  teaser: ""
---

{%- include toc -%}

## The Problem

### Modeling complex infrastructure with a declarative DSL

There are a number of **[issues and limitations with Azure ARM templates](https://pascalnaber.wordpress.com/2018/11/11/stop-using-arm-templates-use-the-azure-cli-instead/)**, and to be fair, many of them are not specific to ARM templates but pertain to declarative <abbr title="Domain Specific Languages">DSLs</abbr> in general.  

The first and most painfully obvious issue with declarative <abbr title="Domain Specific Languages">DSLs</abbr> is their limited support for **logic**. Constructs which are trivial in any general purpose programming language (iteration, conditions, etc...) tend to be clunky and limited in <abbr title="Domain Specific Languages">DSLs</abbr>.  

> Have you ever tried a `if {...} elseif {...} else {...}` in a YAML-based DSL ?

> How about populating an array variable from the iteration over another array variable or parameter, in an ARM template ?

It is feasible, yes, but :  
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

This is definitely not the case with most ARM templates, we often scroll down, and up, and down again... to understand exactly what is going on.  

This also impacts dev workflow/collaboration because some source management tools may not display the diffs for such long files. This makes reviewing pull requests more complicated than it should be.  

In most programming contexts, **we would never tolerate such large and monolithic code**, so should we tolerate this for our infrastructure code ?  

I don't think so.  
So let's see how **[Terraform](https://www.terraform.io/)** can help, with an example based on this template :  
**[201-jenkins-acr](https://github.com/Azure/azure-quickstart-templates/tree/master/201-jenkins-acr)**  

## Breaking Down the Problem Into Smaller Parts

**Decomposition** is a crucial aspect of Software Engineering (and problem-solving in general). It is the practice of breaking a problem down into smaller parts to make it easier to tackle.  

This manifests in code organized in small units of code, which have clear, logical boundaries and which are named to express their purpose. This can be functions, or classes in object-oriented languages.  
In **Terraform**, these units of code are **modules**.  

> How do we decide where to split the code ?  
> In other words, how do we define the boundaries of our Terraform modules ?

### A module should have a single purpose, or a clear focus

This is typically reflected in the module's naming. If we find it hard to find a meaningful and concise name for our module, this is a sign that the module may be doing more than 1 thing.  

On the other hand, if we have 3 modules, named : `storage`, `networking`, `compute`, we can easily guess what each module does and each name convey a well-defined, logical concern.  

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
They all have a single-word name, which an indication that they have a single purpose. We can (hopefully) identify each module's responsibility, just by looking at its name.  

By the way, all the code we are talking about here is available **[in this GitHub repository](https://github.com/MathieuBuisson/tf-jenkins-acr)**.  

### A module should be generic enough to allow for reuse

### A module should group tightly coupled resources together

### A module should be loosely coupled with other modules

### A module should abstract complexity for the caller

## Composing a Solution For the Overall Problem

