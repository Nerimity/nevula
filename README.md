# nertivia markup
> A (relatively) simple and (hopefully) performant markup parser made for nertivia.

**Please note, this is not a markdown parser, this is its own special markup format, a specification for this format is a work in progress.**

This project has grown out of a need for a relatively simple renderer agnostic, reasonably performant markup parser with a relatively small code size.

# Features

## renderer agnostic
The outputted entity format is fairly simple and has been designed to make it easy to make renderers for

## relatively simple
This may change over time, but for now it only parses a fairly restricted set of rules intented to make sense

An example of this is the italic syntax, `//` looks slanted like italicized text and two slashes are used to be consistent with other rules and to make it easier to avoid conflicts with other text

## reasonably performant
see: [Benchmarks](#Benchmarks)

# Benchmarks
Just to be clear, many types of benchmarks will favour this markup because of it's smaller surface area compared to something like a full markdown parser.

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
|nertivia markup|2500|207.814|0.083|
|nertivia markup with inserted text spans|2500|201.809|0.081|
|/x/markdown@v2.0.0 (based on an older version of Marked)|2500|358.297|0.143|
<!-- BENCHMARKS END -->