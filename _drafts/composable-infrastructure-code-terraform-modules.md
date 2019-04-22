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

There are **[many issues and limitations with ARM templates](https://pascalnaber.wordpress.com/2018/11/11/stop-using-arm-templates-use-the-azure-cli-instead/)**, to be fair, many of them are not specific to Azure ARM templates but pertain to declarative <abbr title="Domain Specific Languages">DSLs</abbr> in general.  

The first and most painfully obvious issue with declarative <abbr title="Domain Specific Languages">DSLs</abbr> is their limited support for **logic**. Constructs which are trivial in any general purpose programming language (iteration, conditions, etc...) tend to be clunky and limited in <abbr title="Domain Specific Languages">DSLs</abbr>.  

> Have you ever tried a `if {...} elseif {...} else {...}` in a YAML-based DSL ?

> How about populating an array variable from the iteration over another array variable or parameter, in an ARM template ?

It is feasible, yes, but :  
  - Is the syntax clean and readable ?
  - Is it properly explained in the documentation (with examples) ?
  - Is it easy to debug when it blows up in your face ?

I'll let you answer that yourselves.  

Sometimes. We can get away with not using any logic and stick with a purely declarative approach, but this implies one of 2 things :  
  - The scenario is contrived or very simple
  - It compromises **<abbr title="Don't Repeat Yourself">DRY</abbr>** and the development experience becomes **CPDD** (copy-paste driven development)

YAML and JSON were intended as data serialization formats, not to represent complex infrastructure stacks, and that is the root of this problem ([eloquently explained here](https://blog.atomist.com/in-defense-of-yaml/)).  

### Large monolithic ARM templates

It is not uncommon for Azure ARM templates to grow to 500, 600, or even 1000+ lines. Don't take my word for it, just browse the **[Azure Quickstart Templates repo](https://github.com/Azure/azure-quickstart-templates)**.  

There are 2 main reasons for that :  
  - The ARM template syntax is quite verbose
  - Splitting large templates into smaller ones is not always possible or easy

Sure, we can use [linked templates](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-linked-templates), but the only way to specify a linked template is a URL, and it has to be publicly accessible.  

Many coding standards, in any programming language have guidelines in terms of lines code per function, method, class, or file. A basic principle is :  
> To be easy to read and understand, it should fit into a screen

This is definitely not the case with most ARM templates, we end up scrolling down, and up, and down again... to understand exactly what is going on.  

This also impacts dev workflow/collaboration because some source management tools may not display the diffs for such long files. This makes reviewing pull requests more complicated than it should be.  

In most programming contexts, **we would never tolerate such large and monolithic code**, so should we tolerate this for our infrastructure code ?  

I don't think so.  
So let's see how **[Terraform](https://www.terraform.io/)** can help with a concrete example, which is this QuickStart Template :  
**[201-jenkins-acr](https://github.com/Azure/azure-quickstart-templates/tree/master/201-jenkins-acr)**  

## Breaking Down the Problem Into Smaller Parts

**Decomposition** is a crucial aspect of Software Engineering (and problem-solving in general). It is the practice of breaking a problem down into smaller parts to make it easier to tackle.  

This manifests in code organized in small units of code, which have clear, logical boundaries and which are named to express their purpose. This can be functions, or classes in object-oriented languages. In **Terraform**, this would be **modules**.  

### Defining the boundaries of Terraform modules

