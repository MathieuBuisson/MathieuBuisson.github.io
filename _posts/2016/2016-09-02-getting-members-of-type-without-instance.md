---
title: Getting the members of a type, without an instance of the type
tags:
  - PowerShell
---

I read [Jeff Hicks](https://twitter.com/jeffhicks)'s article about "[Dancing on the table with PowerShell](https://www.petri.com/dancing-on-the-table-with-powershell)". The content is really quite fascinating (go read it !), but I got hung up on something.  

He creates a new object of the type `[System.Data.DataTable]`, pipes it to `Get-Member` and shows that we can't discover the members of this object type, like so :  

```powershell
C:\> $table = New-Object -TypeName 'System.Data.DataTable'
C:\> $table | Get-Member
Get-Member : You must specify an object for the Get-Member cmdlet.
At line:1 char:10
+ $table | Get-Member
+          ~~~~~~~~~~
    + CategoryInfo          : CloseError: (:) [Get-Member], InvalidOperationException
    + FullyQualifiedErrorId : NoObjectInGetMember,Microsoft.PowerShell.Commands.GetMemberCommand
```

My understanding is that `Get-Member` is complaining because at this point, `$table` is not a fully formed object. Even though it has a type :

```powershell
C:\> $table.GetType()

IsPublic IsSerial Name                                     BaseType
-------- -------- ----                                     --------
True     True     DataTable                                System.ComponentModel.MarshalByValueComponent
```

Anyway, my thought was :  

> There has to be a way to get the members of a type, even without an instance of that type  

So, let's see how we can do that.  
First, we get a type object from our type name :

```powershell
C:\> $TypeObj = 'System.Data.DataTable' -as [Type]    
```

Then, this `[Type]` object surely has a property or a method allowing us to view the members associated with that type.  
So we can try something like this :

```powershell
C:\> $TypeObj | Get-Member -Name "*Members*"

   TypeName: System.RuntimeType

Name              MemberType Definition
----              ---------- ----------
FindMembers       Method     System.Reflection.MemberInfo[] FindMembers(System.Reflection.MemberTypes memberType, Sy...
GetDefaultMembers Method     System.Reflection.MemberInfo[] GetDefaultMembers(), System.Reflection.MemberInfo[] _Typ...
GetMembers        Method     System.Reflection.MemberInfo[] GetMembers(), System.Reflection.MemberInfo[] GetMembers(...
```

Yep, the `GetMembers` method (if it does what it says) is what we want.  
Let's try it :

```powershell
C:\> $TypeObj.GetMembers() | Select-Object -Property 'Name', 'MemberType'

Name                    MemberType
----                    ----------
get_CaseSensitive           Method
set_CaseSensitive           Method
get_IsInitialized           Method
set_RemotingFormat          Method
get_RemotingFormat          Method
get_ChildRelations          Method
get_Columns                 Method
get_Constraints             Method
get_DataSet                 Method
get_DefaultView             Method
set_DisplayExpression       Method
get_DisplayExpression       Method
get_ExtendedProperties      Method
get_HasErrors               Method
get_PrimaryKey              Method
set_PrimaryKey              Method

# Ouput cut for brevity

C:\> ($TypeObj.GetMembers() | Select-Object -Property 'Name', 'MemberType').Count
159
```

There are a lot of members for this type.  
This method also allows us to see some members that we wouldn't see by default using `Get-Member`, because it even gets non-public members.  
And there are some duplicates :

```powershell
C:\> ($TypeObj.GetMembers() | Select-Object 'Name', 'MemberType' -Unique).Count
120
```

By the way, in case we are only interested in the properties, there is another method (aptly named `GetProperties`) which gets only the properties :

```powershell
C:\> $TypeObj.GetProperties() | Select-Object -Property 'Name', 'MemberType'

Name               MemberType
----               ----------
CaseSensitive        Property
IsInitialized        Property
RemotingFormat       Property
ChildRelations       Property
Columns              Property
Constraints          Property
DataSet              Property
DefaultView          Property
DisplayExpression    Property
ExtendedProperties   Property
HasErrors            Property
Locale               Property
MinimumCapacity      Property
ParentRelations      Property
PrimaryKey           Property
Rows                 Property
TableName            Property
Namespace            Property
Prefix               Property
Site                 Property
Container            Property
DesignMode           Property
```

That's pretty much all we need to know to view the members associated with a type, without having to create an object of that type.  

We can package this knowledge into a function, for convenient reuse, like so :

```powershell
Function Get-MemberFromTypeName
{
    [CmdletBinding()]
    Param (
        [Parameter(Mandatory)]
        [string]$TypeName
    )
    $TypeObj = $TypeName -as [Type]
    $RawMembers = $TypeObj.GetMembers()

    [System.Collections.ArrayList]$OutputMembers = @()
    Foreach ( $RawMember in $RawMembers ) {
        
        $OutputProps = [ordered]@{
            'Name'= $RawMember.Name
            'MemberType'= $RawMember.MemberType
        }
        $OutputMember = New-Object -TypeName psobject -Property $OutputProps
        $OutputMembers += $OutputMember
    }
    $OutputMembers | Select-Object -Property * -Unique
}
```
