import { assertEquals } from "https://deno.land/std@0.89.0/testing/asserts.ts";
import { addTextSpans, Entity, parseMarkup } from "./markup.ts";

Deno.test("parse multiple levels of syntax", () => {
  const text = "__~~**//italic bold  ``code`` strikethrough underline//**~~__";

  assertEquals<Entity>(
    parseMarkup(text),
    {
      type: "text",
      innerSpan: { start: 0, end: text.length },
      outerSpan: { start: 0, end: text.length },
      entities: [
        {
          type: "underline",
          innerSpan: { start: 2, end: text.length - 2 },
          outerSpan: { start: 0, end: text.length },
          entities: [
            {
              type: "strikethrough",
              innerSpan: { start: 4, end: text.length - 4 },
              outerSpan: { start: 2, end: text.length - 2 },
              entities: [
                {
                  type: "bold",
                  innerSpan: { start: 6, end: text.length - 6 },
                  outerSpan: { start: 4, end: text.length - 4 },
                  entities: [
                    {
                      type: "italic",
                      innerSpan: { start: 8, end: text.length - 8 },
                      outerSpan: { start: 6, end: text.length - 6 },
                      entities: [
                        {
                          type: "code",
                          innerSpan: { start: 23, end: 27 },
                          outerSpan: { start: 21, end: 29 },
                          entities: [],
                          params: {},
                        },
                      ],
                      params: {},
                    },
                  ],
                  params: {},
                },
              ],
              params: {},
            },
          ],
          params: {},
        },
      ],
      params: {},
    },
  );
});

Deno.test("parses a complex markup example", () => {
  const text =
    "> blockquote **bold //italic bold// bold** __underline__ ** <- unmatched marker should be safely ignored ``code//not italic because code//`` trailing text";
  assertEquals<Entity>(
    parseMarkup(text),
    {
      type: "text",
      innerSpan: { start: 0, end: text.length },
      outerSpan: { start: 0, end: text.length },
      entities: [{
        type: "blockquote",
        innerSpan: { start: 2, end: text.length },
        outerSpan: { start: 0, end: text.length },
        entities: [
          {
            type: "bold",
            innerSpan: { start: 15, end: 40 },
            outerSpan: { start: 13, end: 42 },
            entities: [{
              type: "italic",
              innerSpan: { start: 22, end: 33 },
              outerSpan: { start: 20, end: 35 },
              entities: [],
              params: {},
            }],
            params: {},
          },
          {
            type: "underline",
            innerSpan: { start: 45, end: 54 },
            outerSpan: { start: 43, end: 56 },
            entities: [],
            params: {},
          },
          {
            type: "code",
            innerSpan: { start: 107, end: 138 },
            outerSpan: { start: 105, end: 140 },
            entities: [],
            params: {},
          },
        ],
        params: {},
      }],
      params: {},
    },
  );
});

Deno.test("parsed multilines and indentation", () => {
  let text = `
> a blockquote!
    > not a blockquote
  `;

  assertEquals<Entity>(
    parseMarkup(text),
    {
      type: "text",
      innerSpan: { start: 0, end: text.length },
      outerSpan: { start: 0, end: text.length },
      entities: [{
        type: "blockquote",
        innerSpan: { start: 3, end: 16 },
        outerSpan: { start: 0, end: 17 },
        entities: [],
        params: {},
      }],
      params: {},
    },
  );
});

Deno.test("custom_end should be ignored", () => {
  let text = `abc ]`;

  assertEquals<Entity>(
    parseMarkup(text),
    {
      type: "text",
      innerSpan: { start: 0, end: text.length },
      outerSpan: { start: 0, end: text.length },
      entities: [],
      params: {},
    },
  );
});

function textSlices(text: string, entity: Entity): string[] {
  switch (entity.type) {
    case "text":
      if (entity.entities.length === 0) {
        return [text.slice(entity.innerSpan.start, entity.innerSpan.end)];
      }
    default:
      return entity.entities.flatMap((e) => textSlices(text, e));
  }
}

Deno.test("addTextSpans should add text spans", () => {
  let text = `1__2**3**4__5`;
  let textNodes = textSlices(text, addTextSpans(parseMarkup(text)));

  assertEquals(
    textNodes,
    ["1", "2", "3", "4", "5"],
  );
});

Deno.test("addTextSpans should add text spans for advanced markup", () => {
  let text = `
> 1__2__3
4 \`\`\`not
5
\`\`\` 6
7
`.trim();
  let textNodes = textSlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["1", "2", "3", "4 ", "5\n", " 6\n7"],
  );
});

Deno.test("codeblocks should work with or without the language specified", () => {
  let text = `
\`\`\`js
let x = 0;
\`\`\`

\`\`\`
just text
\`\`\`
`.trim();
  let textNodes = textSlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["let x = 0;\n", "\n\n", "just text\n"],
  );
});

// testing every type of entity
type EntitySlice = [string, object, string] | [string, object, EntitySlice[]];

function entitySlices(text: string, entity: Entity): EntitySlice {
  if (entity.type === "text" && entity.entities.length === 0) {
    return [
      entity.type,
      entity.params,
      text.slice(entity.innerSpan.start, entity.innerSpan.end),
    ];
  }
  return [
    entity.type,
    entity.params,
    entity.entities.map((e) => entitySlices(text, e)),
  ];
}

Deno.test("root text entity should parsed the remaining text", () => {
  let text = `hello world!`.trim();
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, "hello world!"],
  );
});

Deno.test("bold should be parsed", () => {
  let text = `**hello world!**`.trim();
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["bold", {}, [["text", {}, "hello world!"]]]]],
  );
});

Deno.test("italic should be parsed", () => {
  let text = `//hello world!//`.trim();
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["italic", {}, [["text", {}, "hello world!"]]]]],
  );
});

Deno.test("underline should be parsed", () => {
  let text = `__hello world!__`.trim();
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["underline", {}, [["text", {}, "hello world!"]]]]],
  );
});

Deno.test("strikethrough should be parsed", () => {
  let text = `~~hello world!~~`.trim();
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["strikethrough", {}, [["text", {}, "hello world!"]]]]],
  );
});

Deno.test("code should be parsed", () => {
  let text = "``hello world!``".trim();
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["code", {}, [["text", {}, "hello world!"]]]]],
  );
});

Deno.test("code should be parsed", () => {
  let text = `
\`\`\`
hello world!
\`\`\`

\`\`\`language
hello world!
\`\`\`
`.trim();
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [
      ["codeblock", { lang: "" }, [["text", {}, "hello world!\n"]]],
      ["text", {}, "\n\n"],
      [
        "codeblock",
        { lang: "language" },
        [["text", {}, "hello world!\n"]],
      ],
    ]],
  );
});

Deno.test("blockquote should be parsed 'inline'", () => {
  let text = "> hello world!".trim();
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["blockquote", {}, [["text", {}, "hello world!"]]]]],
  );
});

Deno.test("blockquote should be parsed", () => {
  let text = "\n> hello world!\n";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["blockquote", {}, [["text", {}, "hello world!"]]]]],
  );
});

Deno.test("blockquote should be parsed with multiple", () => {
  let text = "\n> hello world!\n> hello world 2!";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["blockquote", {}, [["text", {}, "hello world!"]]], [
      "blockquote",
      {},
      [["text", {}, "hello world 2!"]],
    ]]],
  );
});

Deno.test("custom entities should be parsed", () => {
  let text = "[name: hello world!]";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["custom", { type: "name" }, [[
      "text",
      {},
      " hello world!",
    ]]]]],
  );
});

Deno.test("custom entities a single symbol should be parsed", () => {
  let text = "[@: hello world!]";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [["custom", { type: "@" }, [["text", {}, " hello world!"]]]]],
  );
});

Deno.test("escapes should escape entities", () => {
  let text = String.raw`\[@: hello world!]`;
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [
      ["text", {}, "["],
      ["text", {}, "@: hello world!]"],
    ]],
  );
});

Deno.test("escapes should escape in code entities", () => {
  let text = "`` hello \\`` world! ``";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [
      ["code", {}, [
        ["text", {}, " hello "],
        ["text", {}, "`"],
        ["text", {}, "` world! "],
      ]],
    ]],
  );
});

Deno.test("escapes should escape in codelock entities", () => {
  let text = "``` hello \\``` world! ```";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [
      ["codeblock", { lang: undefined }, [
        ["text", {}, " hello "],
        ["text", {}, "`"],
        ["text", {}, "`` world! "],
      ]],
    ]],
  );
});

Deno.test("escapes should escape in expression entities", () => {
  let text = "[name: hello \\] world! ]";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [
      ["custom", { type: "name" }, [
        ["text", {}, " hello "],
        ["text", {}, "]"],
        ["text", {}, " world! "],
      ]],
    ]],
  );
});

Deno.test("blockquotes should have entities inside of them", () => {
  let text = "> **hello world!**";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [
      ["blockquote", {}, [
        ["bold", {}, [
          ["text", {}, "hello world!"],
        ]],
      ]],
    ]],
  );
});

Deno.test("emojis should be parsed", () => {
  let text = "hello ✨ world";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [
      ["text", {}, "hello "],
      ["emoji", {}, [
        ["text", {}, "✨"],
      ]],
      ["text", {}, " world"],
    ]],
  );
});

Deno.test("emoji names should be parsed", () => {
  let text = "hello :sparkles: world";
  let textNodes = entitySlices(text, addTextSpans(parseMarkup(text)));
  assertEquals(
    textNodes,
    ["text", {}, [
      ["text", {}, "hello "],
      ["emoji_name", {}, [
        ["text", {}, "sparkles"],
      ]],
      ["text", {}, " world"],
    ]],
  );
});