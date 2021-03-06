# nevula
> A (relatively) simple and (hopefully) performant markup parser.

**Please note, this is not a markdown parser, this is it's own special markup format called nevula, a specification for this format is a work in progress.**

This project has grown out of a need for a relatively simple renderer agnostic, reasonably performant markup parser with a relatively small code size.

# Features

## renderer agnostic
the outputted entity format is fairly simple and has been designed to make it easy to make renderers for

## relatively simple
this may change over time, but for now it only parses a fairly restricted set of rules intented to make sense

an example of this is the italic syntax, `//` looks slanted like italicized text and two slashes are used to be consistent with other rules and to make it easier to avoid conflicts with other text

## reasonably performant
see: [Benchmarks](#Benchmarks)

# Benchmarks
Just to be clear, many types of benchmarks will favour nevula because of it's smaller surface area compared to something like a full markdown parser.

<!-- BENCHMARKS START -->
## Simple Markup

```md
> **Hello world!**

**__inside__ __inside again__**

``code``

** ~~not~~ a complete marker! __complete__
```
|Name|Runs|Total (ms)|Average (ms)|
|:--|--:|--:|--:|
|nevula|2500|149.993|0.060|
|/x/markdown@v2.0.0 (based on an older version of Marked)|2500|281.427|0.113|
<!-- BENCHMARKS END -->