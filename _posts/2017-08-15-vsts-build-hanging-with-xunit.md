---
layout: post
category:
- Visual Studio
title: VSTS Build hanging with XUnit tests
tags:
- VSTS
- VisualStudio
- XUnit
- ALM
comments: []
---
I was setting up a simple demo on Visual Studio Team Services ([VSTS](https://www.visualstudio.com/team-services/))
today and ran into an oddity.The sample project I was using had a mixture of MSTest and XUnit-based tests. This would run
just fine in Visual Studio, but after setting up a hosted build in VSTS, I noticed
that the build would seem to hang after apparently running all tests, so I had to
cancell builds.

Looking at the logs, I eventually found this line, which was not expected:

```
2017-08-15T16:48:44.4074176Z Information: [xUnit.net 00:00:00.8781599]   Starting:    Microsoft.VisualStudio.QualityTools.UnitTestFramework
```

Suspecting this could be related, I modified the build definition. In the `Test Assemblies` task,
I modified the _Test assemblies_ property to include the following line:

```
!**\Microsoft.VisualStudio.QualityTools.UnitTestFramework.dll
```

This tells the test runner not to try to attempt to discover or run tests in this DLL.

Surprisingly, this worked and allow builds to complete normally after running all tests.