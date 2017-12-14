---
layout: post
category: Azure
title: Azure API Management - Getting Query String Values in set-body
tags:
- Azure
- APIManagement
comments: []
---
Ran a question recently that was a bit tricky to solve with Azure API Management:
How do you get a value passed in the URL Query String to your API operation
from a policy in a `<set-body>` statement?

For example, let's assume that the query string value we want is called `userId`.
If you're using a _Liquid_ template, it would look something like this:

```xml
<set-body template="liquid">
{
    "userId": "{{"{{context.Request.OriginalUrl.Query.userId}}}}"
}
</set-body>
```

Notice how we use `OrigiinalUrl` rather than `Url`. The former is the URL
the consumer used to call into API Management, while the latter is the URL of
the backend service.

If you're not using a _Liquid_ template, then you just need to make sure that your
`set-body` expressoin explicitly returns a `string` object:

```xml
<set-body template="none">
    @("The user id is: " + context.Request.OriginalUrl.Query.GetValueOrDefault("userId"))
</set-body>
```

The [set-body](https://docs.microsoft.com/en-us/azure/api-management/api-management-transformation-policies#SetBody)
reference documentation provides some useful information on figuring stuff like this out,
particularly when combined with the [policy expressions](https://docs.microsoft.com/en-us/azure/api-management/api-management-policy-expressions)
documentation.

