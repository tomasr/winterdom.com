---
slug: "kondex-teaching-claude-to-use-it"
categories:
- Tools
title: 'Kondex: Teaching Claude to use it'
tags:
- Claude
- LLM
- Tools
comments: []
---
In my previous two posts, I covered [how `kondex` builds its index](/2026/09/14/kondex-a-declaration-indexing-tool) and [how you can query it](/2026/09/15/kondex-searching-the-index). There's one part I haven't talked about yet, though: an index is not very useful if the LLM never thinks of using it. In this post, I'd like to go over how I got Claude Code to actually reach for `kondex`, which turned out to be surprisingly hard, and what I learned along the way.

If you look back at the architecture diagram in the first post, you'll notice a box labeled "kondex plugin", which contains a `SessionStart` hook and a skill. Let's see why both of them are there.

## Starting with a skill

Claude Code supports [skills](https://docs.claude.com/en/docs/claude-code/skills), which are just a folder with a `SKILL.md` file describing what the skill is for and how to use it. Claude sees a list of the available skills (only their names and a short description), and loads the full contents of one when it decides it is relevant to the task at hand.

Creating a skill was the obvious thing to try, so the first thing I did was write a skill, originally just called `kondex`, with a full reference on how to use the tool: the commands, the ref syntax, the flags, and so on. That didn't work, however. Claude kept doing what it always does, grepping through the repository and reading whole files.

<!-- TODO: was the name your first suspect? Reword if the rename happened for a different reason. -->
This led me to wonder if the skill name was just too abstract. Yes, the skill description is obviously important, but one would guess a name like `kondex` does not say anything about what the tool does. So I renamed the skill to `find-declarations`, and rewrote the description so that it started with the questions it could answer. Unfortunately, that did not seem to make much difference either.

## Measuring it

At this point, I decided to stop guessing and measure what was going on. The setup was fairly simple:

- A fixed question with a known answer, run against our monorepo. I picked one that `kondex` is very good at answering: which columns of one of our connectors can be filtered server-side?
- A headless `claude -p` run for each configuration I wanted to test. Each configuration differed from the others by exactly one command line flag (`--plugin-dir`, `--append-system-prompt`, or an environment variable).
- Counting the `kondex` calls, greps and total tool calls in each session transcript.
- Three runs for each configuration, since the model is not deterministic and a single run doesn't prove much.

Here are the results, averaged over the three runs:

| What was installed | Runs that used kondex | kondex calls | Greps | Tool calls |
|---|---|---|---|---|
| Nothing | 0/3 | 0.0 | 8.3 | 12.3 |
| The skill | 0/3 | 0.0 | 7.7 | 9.7 |
| Skill + usage notes in the system prompt | 3/3 | 7.7 | 0.0 | 8.0 |
| Skill + `PreToolUse` hook (advisory) | 3/3 | 5.0 | 3.7 | 11.0 |
| Skill + `PreToolUse` hook (blocking) | 3/3 | 7.3 | 3.0 | 14.3 |
| Skill + usage notes from a `SessionStart` hook | 3/3 | 5.0 | 0.7 | 6.0 |

The first two rows are the interesting ones. A session with the skill installed used `kondex` exactly as often as a session with nothing installed at all, which was never. And the question was not a tricky one either: it was taken almost word for word from the skill's own description.

**Note:** Every configuration got the right answer, including the one with nothing installed. Claude can find the answer by grepping, it just takes longer and uses more context doing it. So this experiment was strictly about whether Claude used the tool or not.

## Why didn't the skill work?

The best explanation I have is that it's a matter of timing. Claude chooses skills from that list of names and descriptions, but it is not looking at the list when it decides to grep for something. That usually happens many tool calls into a task, in the middle of tracking something down, and not at the start, when it is deciding how to approach the problem. So no amount of rewording the description was going to help.

On top of this, I would presume that built-in tools probably just take precedence over whatever skills describe. 

What does work is having the guidance in context before the first search. You can see this in the third row of the table: putting the same usage notes directly in the system prompt got `kondex` used in every single run, and the greps went away entirely.

The two attempts using `PreToolUse` are also interesting. A `PreToolUse` hook runs before each tool call, so I wrote one that caught greps that looked like a search for a declaration, and suggested (or required) using `kondex` instead. This does get `kondex` used, but the hook only fires after Claude has already decided to grep, so you pay for the abandoned attempt: 11 to 14 tool calls, which is worse than having nothing installed at all. A good attempt, but ended up having to scrap it.

## Why a plugin?

So the guidance needs to be in context right from the start of the session. There are a few ways to do that, but each of them has a problem:

- **`--append-system-prompt`**: This works, but nobody is going to type that every time they start Claude Code.
- **A `CLAUDE.md` file**: Adding the instructions to the repository would also work, but that means committing `kondex`-specific instructions into every repository that uses it. For our monorepo, that means a pull request against a code base shared by the whole team, for a tool that not everyone has installed.
- **A `SessionStart` hook**: This runs when a session starts, and can add text to Claude's context, which is exactly what we need. Hooks can also be distributed as part of a [Claude Code plugin](https://docs.claude.com/en/docs/claude-code/plugins).

That's the last row of the table, and it had the best results of all: `kondex` got used in every run, there were almost no greps, and Claude needed half the tool calls it used with nothing installed, because it skipped the exploratory grepping altogether.

## What's in the plugin

The plugin lives in the `kondex` repository itself, and it's pretty small:

```
.claude-plugin/
  marketplace.json          makes the repository installable as a marketplace
claude/
  .claude-plugin/
    plugin.json             the plugin manifest
  hooks/
    hooks.json              registers the SessionStart hook
    session_context.py      the hook itself
  fragment.md               the usage notes the hook puts in context
  skills/
    find-declarations/
      SKILL.md              the full reference
```

Installing it only takes a couple of commands inside Claude Code:

```
/plugin marketplace add <path-to-kondex>
/plugin install kondex
```

Or, if you just want to try it for a single session:

```
> claude --plugin-dir <path-to-kondex>\claude
```

The hook is registered with a few lines of JSON:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python \"${CLAUDE_PLUGIN_ROOT}/hooks/session_context.py\"",
            "timeout": 20
          }
        ]
      }
    ]
  }
}
```

The `session_context.py` script doesn't do much more than that:

1. It runs `kondex status` to check whether the session is starting inside a git repository that `kondex` can work with. If `kondex` is not installed, or this isn't a git repository, it returns nothing, so a session somewhere else doesn't pay for anything. In my case, the tool will always be present, but it didn't hurt to add just in case.
2. Otherwise, it reads `fragment.md` and returns it to Claude Code as `additionalContext`.

Using `kondex status` for the check was on purpose: it is the only command that reports on a repository without indexing it, so it's safe to run at the start of every session.

**Note:** Make sure you use the `additionalContext` field. A hook can also return a `systemMessage`, but that is only shown to the user in the console, and never reaches the model. 

If you want to turn the hook off without uninstalling the plugin, you can set the `KONDEX_SESSION_CONTEXT` environment variable to `off`.

**The downside:**: `kondex` supports only a specific subset of languages. Having the plugin enabled when working on a repo that uses an unsupported language would probably not... be a great user experience. Something I might look into improving later on.

## The fragment

The `fragment.md` file contains the text Claude actually sees at the start of every session. It's about 150 lines long, and it starts like this:

```
## Finding declarations

This repository is indexed by `kondex`. **Use it before grepping for a class
name or opening a source file to look up a declaration.** A query costs ~0.5s
and a few hundred tokens; reading a 4,000-line file to find one signature costs
~50,000.
```

After that comes a short cheat sheet with every command and its most useful flags, followed by a few paragraphs covering the things Claude kept getting wrong.

**Note:** This isn't free. The fragment adds roughly 2,300 tokens to the context of every session in a repository. Considering that a single read of a large source file can cost 20 times that, I think it's a good trade, but it's something to be aware of.

The skill is still part of the plugin, but it's now more of a fallback. In the configurations that used the fragment, the skill was only loaded zero or one times out of three, because the fragment already had what Claude needed. A skill costs nothing until it's used, so it is still a good place for the full reference that doesn't fit in the fragment.

> Something I really wished Claude Code had better support for was reporting metrics for plugin usage. Unfortunately, the OpenTelemetry-based instrumentation in Claude Code is useless unless your plugin comes from a "known marketplace". Sigh.

## Trying it on real work

The results in the table come from a single question, on a single repository, with three runs for each configuration. That's a good start, but I wanted to see what would happen on real work. So I took an actual ticket from our backlog and had Claude Code investigate and fix it twice: once with only the skill installed, and once with the plugin.

The good news is things worked as expected: The fragment injected by the hook did what it was supposed to do, and Claude went from never using `kondex` to calling it 10 times, the first one before it did any grepping.

Unfortunately (and it was surprising), it kept grepping just as much as before. Both sessions ran 32 searches over the source code, and used about the same number of tool calls and output tokens. Even the time was almost the same (49 minutes against 48). So the "half the tool calls" result from the table did not carry over to a real investigate-and-fix task at all.

Claude Code is fantastic at researching its own session transcripts, so of course I had it go through the transcripts for these attempts. I found three reasons for this:

1. About half of the remaining greps were looking for references rather than declarations: who calls this method, or where is this helper used. `kondex` only indexes declarations, so no prompt was going to fix that. (This is also what eventually led to the experimental `callers` command I skipped in the last post.)
2. The fragment was missing two flags: `--sig` and `--limit`. Twice, Claude was using `kondex` correctly, then hit the default limit of 30 results, or couldn't see the declaration it needed, and went back to grep. Both flags were documented in the skill, but since the skill was never loaded, Claude never saw them.
3. `kondex` indexes the content staged in git. While Claude is editing files during the fix, those files are stale in the index by design, so grep is actually the right tool for them.

After adding the missing flags to the fragment, I tried again with a different ticket. This time Claude ran 13 greps instead of 32, and the whole session took 23 minutes instead of 49. It's a single run on a different task, so I wouldn't read too much into the exact numbers, but it was a nice step in the right direction.

## Designing the output

Once Claude was using the tool regularly, it also became clear that the output of `kondex` is part of the prompt too (or rather part of the model input tokens), and it needs to be designed with that in mind. Here are a couple of examples from those same sessions:

- **Counting results**: In one session, Claude asked for every implementation of a very common method. `kondex` correctly returned 180 results, but when a tool result is that large, Claude Code saves it to a file and only keeps a preview of the beginning in context. The total count was at the end of the output, so it got cut off, and Claude's final report said there were around 30 implementations, when the real number was 145. This is why long listings now show the total count at the top as well, and why the `--count` flag exists.
- **Using line ranges**: Every result from `kondex` includes a line range, and the fragment told Claude to use it to read only the lines it needed. Claude did use the start line, but across 19 reads, it used the end line only once. In one case, it read the same file six times in overlapping chunks, 28.7 KB in total, to get to a method that was only 944 bytes long. The problem is that the `Read` tool takes a starting line and a number of lines rather than a start and an end, and that bit of arithmetic was enough to lose it. Rewording the instructions wouldn't have helped much here, but adding `show --body` did have a significant impact.

## Conclusion

The surprising conclusion from this was that the skill on its own turned out to not not be sufficient to get Claude to use `kondex`, since Claude doesn't look at the skill when it decides to grep for something. Adding the usage notes at the start of every session through a plugin hook is what finally made the difference, and it took lots of testing and careful measuring of each attempt to discover this.