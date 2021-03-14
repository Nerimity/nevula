import { assertEquals } from "https://deno.land/std@0.89.0/testing/asserts.ts";
import { addTextSpans, Entity, parseMarkup } from "./nevula.ts";

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
  if (entity.entities.length > 0) {
    return entity.entities.flatMap((e) => textSlices(text, e));
  } else {
    return [text.slice(entity.innerSpan.start, entity.innerSpan.end)];
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
