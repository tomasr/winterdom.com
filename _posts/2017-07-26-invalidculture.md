---
layout: post
category: Troubleshooting
title: Culture is not supported
comments: []
---
Today I was helping a customer troubleshoot an issue with a tool that is WPF based.
What was happening was a bit surprising to me, and something I haven't seen all that clearly documented,
so thought that putting it in a blog post would be useful in case I run into it again.

The situation was this:
* Customer connected from their local machine to a Windows Server 2008 R2 server through Remote Desktop Connection.
* Customer ran the WPF tool.
* When the customer tried to give focus to a TextBox, the application would blow up with the following error:

```
Culture is not supported.
Parameter name: culture
22538 (0x580a) is an invalid culture identifier.
```

Culture 0x580a is `es-419` or `Spanish (Latin America)`. Indeed, this gave us a clue: This culture was not originally supported
in Windows Server 2008 R2 (It only started being available in Windows 8.1 and above). So we looked at the region settings
for the user and the machine, and found that:
* The server was configured with the region settings for `Spanish (Argentina)`.
* The client machine used to start the RDP session was configured for `Spanish (Latin America)`.

We thought that was it! So we changed the client region settings and tried again, withouth success.
Where was this `es-419` culture coming from, then?

Time to go back to the code!

Looking at the stack trace for the exception, I noticed that it would go through the `InputLanguageSource.CurrentInputLanguage`,
so I fired up ILSpy and went hunting for the `System.Windows.Input.InputLanguageSource` class, located in `PresentationCore.dll`,
and found this:

```c#
internal InputLanguageSource(InputLanguageManager inputlanguagemanager)
{
    this._inputlanguagemanager = inputlanguagemanager;
    this._langid = (short)NativeMethods.IntPtrToInt32(SafeNativeMethods.GetKeyboardLayout(0));
    this._dispatcherThreadId = SafeNativeMethods.GetCurrentThreadId();
    this._inputlanguagemanager.RegisterInputLanguageSource(this);
}
```

You can already see the surprising aspect here: The culture is being instantiated not from the regional settings, but from the keyboard layout!

Sure enough, the customer had the keyboard layout set to `Spanish - Latin America`, which is a perfectly supported
keyboard layout in Windows Server 2008, but does not match to a corresponding culture.

We then simply changed the keyboard layout to something else, and the error was resolved.
