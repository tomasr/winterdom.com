---
layout: post
category: Azure
title: Using Application Insights Cohorts
tags:
- Viasfora
- Azure
- ApplicationInsights
comments: []
---
A while ago I added some basic telemetry to [Viasfora](http://viasfora.com/)
based on Azure [Application Insights](https://azure.microsoft.com/en-us/services/application-insights/).
This telemetry contains no Personally Identifiable Information (PII)
of note [(*)](#notes), and it is only used to track:
* Viasfora getting loaded into Visual Studio
* Some features being used

All of this is done by emiting custom Events using AppInsights.
You can see the full code [here](https://github.com/tomasr/viasfora/blob/master/src/Viasfora/Telemetry.cs).

One of the things I use this telemetry for is finding out which
Visual Studio versions are seeing the most use amongst Viasfora
users. One feature that was recently added to Application Insights
can make this even easier to analyze: User Cohorts.

User cohorts allow you define groups of users based on `PageView` or
custom `Events` in the telemetry, and their properties. In our case,
every custom event we generate contains a `HostVersion` property,
with the major Visual Studio version:

![Custom event properties]({{site.images_base}}/2017/ai-properties.png)

Based on this, we can easily use Cohorts to create a group for users
running Visual Studio 2017, for example:

![VS2017 users cohort]({{site.images_base}}/2017/ai-cohort.png)

We can save this cohort definition with a name (such as 'VS2017 Users'),
and then use it in other analysis. For example, I can now go to the Users
page, and easily create a report of users running VS2017:

![Report filters]({{site.images_base}}/2017/ai-reportfilter.png)

Notice we're filtering the report to what Viasfora versions are being used
by VS2017 users in the last 30 days. The results are quite interesting:

![VS2017 users by Viasfora version]({{site.images_base}}/2017/ai-vsfusersbyversion.png)

Here we can see that, at the time of this writing, most VS2017 users
where indeed using the most recent release (3.5.139). We can also see
that a few users are running older versions, which is somewhat
unexpected, since Visual Studio 2017 will update extensions automatically
by default.

Repeating the same analysis for VS2013 becomes a snap, as we already
have a cohort define for them:

![VS2013 users by Viasfora version]({{site.images_base}}/2017/ai-vsf2013users.png)

Notice how much more varied the Viasfora versions are; VS2013 do not
seem to update extensions all that often!

## Conclusion

Cohorts are a useful feature in Application Insights that can make analysis
simpler and faster, by grouping users based on some common feature.

## Notes
(*) Telemetry can also be disabled from the Tools -> Options page for Viasfora. 