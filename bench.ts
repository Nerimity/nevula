// deno run --allow-write --allow-read --allow-hrtime ./bench.ts update-readme

import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.90.0/testing/bench.ts";

import {
  defaultColumns,
  prettyBenchmarkDown,
  prettyBenchmarkProgress,
  prettyBenchmarkResult,
} from "https://deno.land/x/pretty_benching@v0.3.2/mod.ts";

import { Marked } from "https://deno.land/x/markdown@v2.0.0/mod.ts";

import { addTextSpans, parseMarkup } from "./markup.ts";

const RUNS = 2500;

const INITIAL_SAMPLE = `
> **Hello world!**

**__inside__ __inside again__**

\`\`code\`\`

** ~~not~~ a complete marker! __complete__
`.trim();

const SAMPLE = INITIAL_SAMPLE.repeat(7);

bench({
  name: "nertivia markup",
  runs: RUNS,
  func(b): void {
    b.start();
    parseMarkup(SAMPLE);
    b.stop();
  },
});

bench({
  name: "/x/markdown@v2.0.0 (based on an older version of Marked)",
  runs: RUNS,
  func(b): void {
    b.start();
    Marked.parse(SAMPLE);
    b.stop();
  },
});

bench({
  name: "nevula with inserted text spans",
  runs: RUNS,
  func(b): void {
    b.start();
    addTextSpans(parseMarkup(SAMPLE));
    b.stop();
  },
});

runBenchmarks(
  { silent: true },
  prettyBenchmarkProgress({}),
)
  .then(
    prettyBenchmarkResult({
      parts: {
        extraMetrics: true,
      },
    }),
  )
  .then(
    prettyBenchmarkDown(
      (markdown) => {
        if (Deno.args[0] === "update-readme") {
          const readme = Deno.readTextFileSync("./README.md");
          const modifiedReadme = readme.replace(
            /(<!-- BENCHMARKS START -->)[^]+(<!-- BENCHMARKS END -->)/g,
            `$1\n${markdown.trim()}\n$2`,
          );

          Deno.writeTextFileSync("./README.md", modifiedReadme);
        }
      },
      {
        groups: [
          {
            include: /.+/,
            name: "Simple Markup",
            description: "```md\n" + INITIAL_SAMPLE + "\n```",
            columns: [
              ...defaultColumns(),
            ],
          },
        ],
      },
    ),
  )
  .catch((e: any) => {
    console.error(e.stack);
  });
