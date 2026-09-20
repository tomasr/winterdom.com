---
layout: post
category: Azure
title: Unable to locate registry entry for adalsql.dll file path
tags:
- AzureSQL
- Azure
comments: []
---
A couple of days ago I was testing with a customer using Azure Active Directory
[integrated authentication](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-aad-authentication)
to Azure SQL Database through the [SQL Server ODBC drivers](https://www.microsoft.com/en-us/download/details.aspx?id=53339).

On one test machine, we kept getting an error similar to this:

```text
Microsoft ODBC Driver 13 for SQL Server : SQL Server Network Interfaces: Unable to locate the registry entry for adalsql.dll file path. Verify that Active Directory Authentication Library for SQL Server is properly installed.
```

We checked, and `adalsql.dll` was present in both `C:\Windows\System32` and `C:\Windows\SysWOW64`,
as expected. We also tried downloading the standalone [library installer](https://www.microsoft.com/en-us/download/details.aspx?id=48742)
but that would not install, since the library was already in the machine.

Looking around, I realized the problem was not that the library was missing, but that it somehow
got installed without it getting registered in the Windows Registry correctly.

To fix this, we created the following registry keys:

```text
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\MSADALSQL]
"TargetDir"="C:\\WINDOWS\\system32\\adalsql.dll"

[HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\MSADALSQL]
"TargetDir"="C:\\WINDOWS\\system32\\adalsql.dll"
```

If your system drive is anything other than `C:`, replace the path accordingly.

After we added these missing keys, the error went away and authentication worked correctly.
