import { assertEquals } from "https://deno.land/std@0.89.0/testing/asserts.ts";
import { Entity, parseMarkup, Span } from "./nevula.ts";

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
        innerSpan: { start: 1, end: text.length },
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
        innerSpan: { start: 2, end: 16 },
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
