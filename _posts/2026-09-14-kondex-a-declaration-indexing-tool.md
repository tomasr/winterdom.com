---
layout: post
category: Tools
title: 'Kondex: A declaration indexing tool'
tags:
- Claude
- LLM
- Tools
comments: []
---

It's been a very long time since I've written on this blog, but wanted to pick this up again, and thought tools would be an excellent topic.

Like most people in the Software Industry, I've been spending increasing amounts of time getting comfortable with LLM-based tools. This includes not only using tools such as GitHub Copilot and Claude Code, but also figuring out better ways to make our engineering team used to them and able to use them effectively.

In the next few days, I'd like to cover some of the internal tools I've built to help support this journey.

**Note:** Right now, these tools are purely internal and not published externally. However, if someone finds them useful, let me know and I'll see what I can do.

First, I'd like to cover a tool called `kondex`.

## What is Kondex?

Kondex is a utility tool that aims to simplify how LLM tools navigate a code base. There's plenty of tools out there that claim to do this by indexing the code itself and then providing search operations on top of the index.

Kondex aims to solve the same issue, but from a slightly different perspective. Kondex does not apply any kind of RAG or vector-driven search. Instead, it works by building an index of all declarations (like classes, methods and other members), and then providing primitives to search through these declarations.

## Why build it?

This is an excellent question. Like I said, there's a number of similar tools out there (many open source), but after testing several of them, I couldn't find one that would do exactly what I wanted and worked well with our specific requirements.

The biggest issues I ran into with other tools were:

- **Size of the code base:** Our connector team works off a fairly big Git monorepo from which we build and deliver 1000s of artifacts, and contains millions of lines of code. Many of the tools I tried would need well over 10 minutes to even do the initial indexing, and even incremental indexing wasn't very performant.
- **Support for Git worktrees:** Our team relies heavily on using [Git Worktrees](https://git-scm.com/docs/git-worktree). Most of the tools I tried are completely unaware of worktrees, and treat each separate branch on disk as a completely different repo, requiring generating a full index every time you created a new worktree. This was unacceptable for our use case.
- **Ignoring files:** Our team makes heavy use of code generation. Our build process not only generates a lot of code files, but also copies stuff around while doing builds, all of which goes into a `./Release` folder that's excluded by `.gitignore`. The problem is most tools don't know anything about this, and will happily index all source files on disk, polluting the index with either duplicate files or just generated code that's irrelevant.

Solving these issues was the primary driver behind developing `kondex`.

## Architecture

Kondex is implemented using [Go](https://go.dev/). I wanted to use a language that would produce native tools for best performance. I am not an expert at Go, but that's where [Claude Code](https://claude.com/product/claude-code) becomes very useful. It helped me build the initial working prototype fast and evolve it over time to fix issues and support new features. The following diagram shows the basic architecture:

![kondex architecture](https://static.winterdom.com/images/2026/kondex-architecture.svg)

Parsing source files is achieved through the use of [Tree Sitter](https://tree-sitter.github.io/tree-sitter/), which does an excellent job of abstracting the complexity of building a syntax tree; `kondex` uses this as the base for its declaration extraction engine. Currently, `kondex` supports parsing declarations from the following languages:

- Java
- Kotlin
- C#
- Go
- Python
- TypeScript
- Terraform

Because of Tree Sitter, adding support for other languages is substantially easier now. **Note:** `kondex` also supports parsing our own metadata definition files, which is done through a custom linear scanner instead of tree-sitter.

The actual index is stored in SQLite.

## Building the Index

I mentioned before one of the key problems I wanted to solve with `kondex` was the cost of building a full index of a repository. Solving this required doing a few tricks that ended up being a very interesting part of the project. The following figure illustrates the process of doing an initial scan for a code base:

![kondex initial scan](https://static.winterdom.com/images/2026/kondex-initial-scan.svg)

The most obvious initial solution for speed was parallelizing the work: `kondex` will indeed scan input files in parallel through the use of multiple threads. However, it has a single thread writing to the SQLite database and it can be the bottlleneck. This is the reason we chose to rebuild indexes at the end of the scan, instead of ensuring they are kept up-to-date as the data is written.

Supporting Git Worktrees required getting a bit more creative. Instead of deciding the list of files to scan using the file system, `kondex` takes a bit of a different approach:

1. `git ls-files -s` gives us the list of all tracked files in the current worktree alongside its blob SHA.
2. Indexed declarations are stored per blob SHA, and shared by every worktree or branch.
3. Each worktree has it's own snapshot, which tracks the path -> blob list

This means that when switching branches or worktrees, `kondex` is able to:
- Keep a single index across branches or worktrees
- Quickly figure out the files that have been changed, removed, or added from the current index and do an incremental scan, which can be done by comparing the new blob SHAs against the list already stored in the index.

Let's illustrate this with an example. First, let's build a full index of our current major branch:

```
> kondex scan
repo   C:/dev/src/<path>  (worktree: C:/dev/src/v26)
index  <path>\index.db
enumerated 145139 tracked files, 55834 indexable, 33173 under excluded directories, 46664 unique blobs (465ms)
cache: 0 hits, 46664 to read (116ms)
suspended query indexes and checkpoints for the load; both are done once at the end
  6162/46664 blobs, 77.0 MB, 129607 declarations
  12533/46664 blobs, 163.3 MB, 265517 declarations
  19370/46664 blobs, 260.2 MB, 410976 declarations
  26076/46664 blobs, 347.3 MB, 546584 declarations
  29517/46664 blobs, 399.7 MB, 615042 declarations
  37074/46664 blobs, 490.4 MB, 768798 declarations
  44792/46664 blobs, 590.0 MB, 923175 declarations
rebuilt query indexes (1.294s)

scanned v26 at c0049c880
  tracked    145,139 files (55,834 indexed)
  blobs      46,664 unique; 0 already cached, 46,597 read
  cache hit  0.0%
  read       618.1 MB
  extracted  963,379 declarations from 46,597 files
  syntax     326 files had error regions (0.70%); entities may be incomplete
  skipped    67 over size limit
  excluded   33,173 files under infoscripts/
  elapsed    18.9s  (enumerate 465ms, diff 116ms, read 15.29s, index 1.29s, write 1.18s, checkpoint 559ms)
  writer     busy 11.85s of the 15.29s read (78%), 2.58s of it committing
```

You can see doing a full index of over 45K files was done in less than 20 seconds. This is good enough that we can use `kondex` even without forcing the developer to manually trigger a full scan the first time the tool is used!

Now let's switch to a worktree tied to a different major branch, and do an incremental scan:

```
> kondex scan
repo   C:/dev/src/<path>  (worktree: C:/dev/src/v25)
index  <path>\index.db
enumerated 147991 tracked files, 54909 indexable, 35470 under excluded directories, 41853 unique blobs (497ms)
cache: 34322 hits, 7531 to read (91ms)
suspended query indexes and checkpoints for the load; both are done once at the end
  2886/7531 blobs, 77.5 MB, 70259 declarations
  5915/7531 blobs, 177.1 MB, 150643 declarations
rebuilt query indexes (1.71s)

scanned v25 at 521d30840
  tracked    147,991 files (54,909 indexed)
  blobs      41,853 unique; 34,322 already cached, 7,493 read
  cache hit  82.0%
  read       225.5 MB
  extracted  192,292 declarations from 7,493 files
  syntax     55 files had error regions (0.73%); entities may be incomplete
  skipped    38 over size limit
  excluded   35,470 files under infoscripts/
  elapsed    9.85s  (enumerate 497ms, diff 91ms, read 5.63s, index 1.71s, write 1.12s, checkpoint 810ms)
  writer     busy 4.14s of the 5.63s read (73%), 714ms of it committing
```

Now we see the incremental scan for a different (older) branch being done in less than 10 seconds. This is a fairly high value due to the number of modified files, but branches with fewer changes will see very fast scans.

## What's next?

I will continue going over `kondex` functionality in a later post, by showing what you can do once an index has been built.