---
slug: "kondex-searching-the-index"
categories:
- Tools
title: 'Kondex: Searching the index'
tags:
- Claude
- LLM
- Tools
comments: []
---
In my [last post](/2026/09/14/kondex-a-declaration-indexing-tool), I introduced `kondex`, a declaration indexing tool I wrote for our team. Today, I'd like to spend some time going over how to use the index to navigate the code base.

**Note:** `kondex` will automatically detect a stale the index on any command and do an incremental scan if necessary.

## Search

The first entry point to the index is the `search` command, which uses a case-insensitive substring match on the declaration name and finds matching declarations:

```
> kondex search OnViewportWidthChanged
method  Winterdom.Viasfora.Rainbow.RainbowLines#OnViewportWidthChanged(object,EventArgs)  src/Viasfora.Rainbow/RainbowLines.cs:154-157
method  Winterdom.Viasfora.Text.CurrentLineAdornment#OnViewportWidthChanged(object,EventArgs)  src/Viasfora.Core/Text/CurrentLineAdornment.cs:83-85
method  Winterdom.Viasfora.Text.PresentationMode#OnViewportWidthChanged(object,EventArgs)  src/Viasfora.Core/Text/PresentationMode.cs:28-31
method  Winterdom.Viasfora.Util.ToolTipWindow#OnViewportWidthChanged(object,EventArgs)  src/Viasfora.Rainbow/Util/ToolTipWindow.cs:76-81

4 results
```

> **Note:** The result of a search in `kondex` lists what we call a `ref`, which will usually take the form of `Type#member(parameter types)`, with constructors using the `<init>` name.
> 
> Members declared outside of a type will be owned by the module/package they are declared in:
> - Go functions will be owned by their package (e.g. `scan#Run()`)
> - Python / TypeScript functions at module level will have an empty owner (e.g. `#UseThis()`)

When searching, exact names will rank first, then prefixes, then any other matches. A term containing `.`, `#` or `(` is matched against the full ref rather than the name, so `search 'Rainbow#On'` works.

There are a couple of interesting additional filters that can be used for search. First, you can narrow down results to only declarations of a specific kind:

```
> kondex search --kind class Rainbow
30 results for "Rainbow" (kind class); more matched

class  Winterdom.Viasfora.Rainbow.Rainbows                          src/Viasfora.Rainbow/Rainbows.cs:4-19
class  Winterdom.Viasfora.Tags.RainbowTag                           src/Viasfora.Core/Tags/RainbowTag.cs:6-11
class  Winterdom.Viasfora.Rainbow.RainbowLines                      src/Viasfora.Rainbow/RainbowLines.cs:52-359
...
class  Winterdom.Viasfora.Rainbow.RainbowKeyProcessorProvider       src/Viasfora.Rainbow/RainbowKeyProcessor.cs:11-24

30 results shown; more matched — raise --limit, or narrow with --kind/--path
```

Note that in the previous example, `kondex` found over 30 matches, so the result is partial. You can do a `search --count` to get just the total number of results without any extra details.

You can also limit results by only searching within a specified path:

```
> kondex search Rainbow --path .\src\Viasfora.Core\
class        Winterdom.Viasfora.Tags.RainbowTag                              src/Viasfora.Core/Tags/RainbowTag.cs:6-11
constructor  Winterdom.Viasfora.Tags.RainbowTag#<init>(IClassificationType)  src/Viasfora.Core/Tags/RainbowTag.cs:8-10
field        Winterdom.Viasfora.Guids#RainbowOptions                         src/Viasfora.Core/Guids.cs:9
field        Winterdom.Viasfora.PkgCmdIdList#cmdidRainbowNext                src/Viasfora.Core/PkgCmdIdList.cs:15
field        Winterdom.Viasfora.PkgCmdIdList#cmdidRainbowPrevious            src/Viasfora.Core/PkgCmdIdList.cs:14

5 results
```

## Outline

Another extremely useful feature of `kondex` is being able to return an outline for a file (meaning, a simplified view of the declarations in the file). Again, this saves LLM tools from having to read the file and extract them directly:

```
> kondex outline .\src\Viasfora.Languages\Sql.cs
src/Viasfora.Languages/Sql.cs  (11 declarations)

  class        Sql                             8-25
  field          #knownContentTypes            10-11
  property       #SupportedContentTypes        12
  property       #Settings                     13
  constructor    #<init>(ITypedSettingsStore)  15-21
  method         #NewBraceScanner()            23-24
  class        SqlSettings                     27-43
  property       #ControlFlowDefaults          28-32
  property       #LinqDefaults                 33-35
  property       #VisibilityDefaults           36-38
  constructor    #<init>(ITypedSettingsStore)  40-42
```

The `outline` command also accepts a folder path as an input, in which case it will produce an outline of all files in the directory (recursively). Since this could be a very large result, it will only report a number of findings (200 declarations by default). You can use `--limit` and `--offset` to narrow it down.

## Members

One common question an LLM might want to answer is: What members does this type declare? That's what the `members` command is for:

```
> kondex members Winterdom.Viasfora.Rainbow.CharPos
struct Winterdom.Viasfora.Rainbow.CharPos  src/Viasfora.Languages/CharPos.cs
  public struct CharPos

  field        CharPos#ch                    5
               private readonly char ch
  field        CharPos#state                 6
               private readonly int state
  field        CharPos#position              7
               private readonly int position
  field        CharPos#Empty                 8
               public static CharPos Empty
  property     CharPos#Char                  10
               public char Char
  property     CharPos#State                 11
               public int State
  property     CharPos#Position              12
               public int Position
  constructor  CharPos#<init>(char,int)      14-15
               public CharPos(char ch, int pos) : this(ch, pos, 0)
  constructor  CharPos#<init>(char,int,int)  17-21
               public CharPos(char ch, int pos, int state)
  method       CharPos#ToString()            27-29
               public override string ToString()

10 members
```

There are two options that can be very useful to `members`:
- The `--public` flag will ask `kondex` to only list public members of the specific class. The rules for each language will determine what is considered public:
  - Java / C# includes only strict `public` members (not `protected`, `internal`, or `package`)
  - Go will define it based on capitalization
  - TypeScript will define it based on `export`
- The `--inherited` flag will ask `kondex` to not only list members directly defined in the specified type, but also in the superclasses (or interfaces) in the source (it will obviously not return anything that comes from external, unindexed libraries). Since `kondex` only does a basic lexical scan, the matching is done by name, which means this is supported strictly as a best-effort.


## Show

Once you've found the declaration you are looking for, you can `show` it:

```
> kondex show "Winterdom.Viasfora.Util.ToolTipWindow#OnViewportWidthChanged(object,EventArgs)"
method Winterdom.Viasfora.Util.ToolTipWindow#OnViewportWidthChanged(object,EventArgs)
  file         src/Viasfora.Rainbow/Util/ToolTipWindow.cs:76-81
  declaration  private void OnViewportWidthChanged(object sender, EventArgs e)
  declared in  Winterdom.Viasfora.Util.ToolTipWindow
```

Note how this gives you the complete method declaration, along with a location (file + line range). This is the ideal case when all you care is about what the declaration looks like (for example, you just want the method signature)

One interesting feature of `show` is that `kondex` is aware of language-specific syntaxes for documenting declarations, such as *javadoc* comments or C#'s `///` comments, and will return those as part of the `show` command where available:

```
> kondex show "Winterdom.Viasfora.Options.MainOptionsControl#Dispose"
method Winterdom.Viasfora.Options.MainOptionsControl#Dispose(bool)
  file         src/Viasfora/Options/MainOptionsControl.Designer.cs:12-17
  declaration  protected override void Dispose(bool disposing)
  declared in  Winterdom.Viasfora.Options.MainOptionsControl

  Clean up any resources being used.

  @param disposing true if managed resources should be disposed; otherwise, false.
```

**Note:** The above example is interesting in that it searches the declaration based on a partial prefix: The ref used is missing the parameter list!

There are cases when an LLM might want more than a signature. For example, it might need to read what the method implementation looks like. In that case, `kondex show` also has the `--body` argument, which gives you its source or body:

```
> kondex show "Winterdom.Viasfora.Util.ToolTipWindow#OnViewportWidthChanged(object,EventArgs)" --body
method Winterdom.Viasfora.Util.ToolTipWindow#OnViewportWidthChanged(object,EventArgs)
  file         src/Viasfora.Rainbow/Util/ToolTipWindow.cs:76-81
  declaration  private void OnViewportWidthChanged(object sender, EventArgs e)
  declared in  Winterdom.Viasfora.Util.ToolTipWindow

  76      private void OnViewportWidthChanged(object sender, EventArgs e) {
  77        this.tipView.ViewportWidthChanged -= this.OnViewportWidthChanged;
  78        if ( this.tipView.ViewportRight > this.tipView.ViewportLeft ) {
  79          this.ScrollIntoView(this.pointToDisplay);
  80        }
  81      }
```

This is very useful to LLM tools as it saves them the need to open the file directly and scan the line range.

**Tip:** In some cases, you might have multiple declarations with the same name. In that case, you will want to either specify `--path` or `--kind` to ensure you get the right one. Note that if the input to `show` is ambiguous, it will provide a list to disambiguate:

```
> kondex show OnViewportWidthChanged
"OnViewportWidthChanged" matches 4 declarations:
  method  Winterdom.Viasfora.Rainbow.RainbowLines#OnViewportWidthChanged(object,EventArgs)  src/Viasfora.Rainbow/RainbowLines.cs:154-157
  method  Winterdom.Viasfora.Text.CurrentLineAdornment#OnViewportWidthChanged(object,EventArgs)  src/Viasfora.Core/Text/CurrentLineAdornment.cs:83-85
  method  Winterdom.Viasfora.Text.PresentationMode#OnViewportWidthChanged(object,EventArgs)  src/Viasfora.Core/Text/PresentationMode.cs:28-31
  method  Winterdom.Viasfora.Util.ToolTipWindow#OnViewportWidthChanged(object,EventArgs)  src/Viasfora.Rainbow/Util/ToolTipWindow.cs:76-81
retry with one of the refs above, or narrow with --kind/--path
```

## Terraform

I thought including a short example of using `kondex` on code bases including terraform scripts would be interesting, as the syntax used can be somewhat different from other languages. For example, searching:

```
> kondex search dns
30 results for "dns"; more matched

data_source  data.azurerm_resource_group.dns-rg                  terraform/dev/dns.tf:29-32
data_source  data.azurerm_resource_group.dns-rg                  terraform/modules/cdatakube_assets/external-dns.tf:5-8
data_source  data.azurerm_resource_group.dns-rg                  terraform/prod/security.tf:65-67
...

30 results shown; more matched — raise --limit, or narrow with --kind/--path
```

You can see Terraform introduces its own set of declaration kinds (data_source, variable, resource, module, output, local, provider). Showing a declaration still works the same way:

```
> kondex show azuread_application.azuredns-sp
resource azuread_application.azuredns-sp
  file         terraform/prod/security.tf:28-31
  declaration  resource "azuread_application" "azuredns-sp"
  members      none

  Create Azure AD App for azure dns
```

An interesting aspect for Terraform is that refs use the exact same syntax the configuration language uses to refer to things.

## The workflow

By now, you can probably guess there's an implicit workflow to using `kondex`:
- `search` to find the name
- `outline` or `members` to see the shape
- `show` when you want the complete declaration, `show --body` when you need the implementation

In other words, the whole purpose is to provide a tool that helps an LLM narrow down as much as possible the possibilities before it reads anything.

One thing worth being honest about: The examples above are almost all from the Viasfora code base, which, let's face it, is very small. The numbers don't reflect much complexity. However, the tool can have substantial impact when operating on a large code base, particularly one that has lots of larger source files. This is where `kondex` really shines, as it lets the LLM avoid having to read larger files directly, or spend multiple cycles trying to figure out the exact boundaries of a declaration for a narrow read.

In the next post, I will cover something that was hinted at in the original article, but not explicitly mentioned: Why `kondex` comes with a Claude Code plugin!