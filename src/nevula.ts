import { containsSpan, partition } from "./utils.ts";

/** A span, similar to ranges in other languages */
export type Span = { start: number; end: number };

/** A generic type meant to make making entities easier and more consistent */
export type EntityType<N, T = {}> = {
  /** The entity type */
  type: N;
  /** The inner text span, similar to innerText */
  innerSpan: Span;
  /** The span of the outer text, similar to outerHTML */
  outerSpan: Span;
  /** The list of entities that this entity contains */
  entities: Entity[];
  /** Params to configure the entity */
  params: T;
};

/** A text entity */
export type Entity =
  | EntityType<"text">
  | EntityType<"bold">
  | EntityType<"italic">
  | EntityType<"underline">
  | EntityType<"strikethrough">
  | EntityType<"code">
  | EntityType<"codeblock", {
    // todo: describe better
    /** What language highlighting should be used to highlight the codeblock */
    lang?: string;
  }>
  | EntityType<"blockquote", {
    /** Not currently used, only typed for spec complience */
    borderColor?: string;
  }>
  | EntityType<"custom", {
    /** The custom expression type */
    type: string;
  }>;

/** 
 * Generate a global regex from a record
 * 
 * each name will become a named capture group
 * */
const generateRegex = (parts: Record<string, RegExp>) => {
  // todo: named grouped regexep's can be slow
  return RegExp(
    Object.entries(parts)
      .map(([type, pattern]) => `(${pattern.source})`)
      .join("|"),
    "g",
  );
};

const generateMapping = (
  parts: Record<string, RegExp>,
) => [...Object.keys(parts)];

const TOKEN_PARTS = {
  bold: /\*\*/,
  italic: /\/\//,
  underline: /__/,
  strikethrough: /~~/,
  codeblock: /```/,
  code: /``/,
  custom_start: /\[\w+:/,
  custom_end: /]/,
  newline: /\n/,
};

// todo: manually do this
const TOKENS = generateRegex(TOKEN_PARTS);
const TYPES = generateMapping(TOKEN_PARTS);

/** A marker used for identifying and matching tokens  */
export type Marker = {
  type: "bold" | "italic" | "underline" | "strikethrough" | "blockquote";
  span: Span;
};

const tokenType = (token: RegExpMatchArray) =>
  TYPES[token.findIndex((g, i) => i != 0 && g != null) - 1];

/**
 * Parses a string into entities
 * @returns A root text entitiy, meant to make entity rendering easier
 */
export function parseMarkup(text: string): Entity {
  let markers: Marker[] = [];
  let entities: Entity[] = [];
  let tokens = [...text.matchAll(TOKENS)];

  /** checks if a line is the beginning to or the end of a blockquote */
  function parseLine(indice: Span) {
    const markerIndex = markers.findIndex((m) => m.type === "blockquote");

    // todo: this is nearly the same as the bold, italic, etc... family of parsing rules and can likely be simplified into a function
    //       for now though I'm keeping it like this for performance and the fear of micro-drying
    if (markerIndex >= 0) {
      const marker = markers[markerIndex];

      const innerSpan = { start: marker.span.end, end: indice.start };
      const outerSpan = { start: marker.span.start, end: indice.end };

      const [innerEntities, remainingEntities] = partition(
        entities,
        (e) => containsSpan(outerSpan, e.outerSpan),
      );

      markers.splice(markerIndex);
      entities = remainingEntities;
      entities.push({
        type: "blockquote",
        innerSpan,
        outerSpan,
        entities: innerEntities,
        params: {},
      });
    }

    if (text.startsWith("> ", indice.end)) {
      markers.push({
        type: "blockquote",
        span: { start: indice.start, end: indice.end + 1 },
      });
    }
  }

  if (!tokens) throw new Error("Did not parse...");

  parseLine({ start: 0, end: 0 });
  for (let pos = 0; pos < tokens.length; pos++) {
    const token = tokens[pos];
    const type = tokenType(token);

    if (token.index == null) {
      throw new Error(`No index found for token: ${token}`);
    }

    const indice: Span = {
      start: token.index,
      end: token.index + token[0].length,
    };

    switch (type) {
      // newline is first because it's the most common and should match first for performance
      case "newline":
        parseLine(indice);
        break;
      case "bold":
      case "italic":
      case "underline":
      case "strikethrough": {
        const markerIndex = markers.findIndex((m) => m.type === type);
        if (markerIndex >= 0) {
          const marker = markers[markerIndex];

          const innerSpan = { start: marker.span.end, end: indice.start };
          const outerSpan = { start: marker.span.start, end: indice.end };

          const [innerEntities, remainingEntities] = partition(
            entities,
            (e) => containsSpan(outerSpan, e.innerSpan),
          );

          markers.splice(markerIndex);
          entities = remainingEntities;
          entities.push({
            type,
            innerSpan,
            outerSpan,
            entities: innerEntities,
            params: {},
          });
        } else {
          markers.push({
            type: type,
            span: indice,
          });
        }

        break;
      }
      case "code": {
        // because code doesn't have innerEntities, we can skip parsing those tokens
        const markerIndex = tokens.findIndex((t, i) =>
          i > pos && tokenType(t) === "code"
        );
        if (markerIndex >= 0) {
          const endToken = tokens[markerIndex];
          const endIndice: Span = {
            start: endToken.index!,
            end: endToken.index! + endToken[0].length,
          };

          entities.push({
            type: "code",
            innerSpan: { start: indice.end, end: endIndice.start },
            outerSpan: { start: indice.start, end: endIndice.end },
            entities: [],
            params: {},
          });

          pos = markerIndex;
        }
        break;
      }
      case "codeblock": {
        // find the matching token
        const markerIndex = tokens.findIndex((t, i) =>
          i > pos && tokenType(t) === "codeblock"
        );
        if (markerIndex >= 0) {
          const endToken = tokens[markerIndex];
          const endIndice: Span = {
            start: endToken.index!,
            end: endToken.index! + endToken[0].length,
          };
          // get lang param
          const langRegex = /\w+\n/;
          langRegex.lastIndex = indice.end;
          const args = langRegex.exec(text);
          // remove the \n
          const lang = args?.[0]?.trim();

          entities.push({
            type: "codeblock",
            // add the lang length to the innerSpan start to skip that when getting the text
            innerSpan: {
              start: endIndice.end + (lang?.length ?? 0),
              end: indice.start,
            },
            outerSpan: { start: endIndice.start, end: indice.end },
            entities: [],
            params: {
              lang: lang,
            },
          });

          pos = markerIndex;
        }
        break;
      }
      case "custom_start": {
        const markerIndex = tokens.findIndex((t, i) =>
          i > pos && tokenType(t) === "custom_end"
        );
        if (markerIndex >= 0) {
          const endToken = tokens[markerIndex];
          console.log(endToken);
          const endIndice: Span = {
            start: endToken.index!,
            end: endToken.index! + endToken[0].length,
          };

          entities.push({
            type: "custom",
            innerSpan: { start: endIndice.end, end: indice.start },
            outerSpan: { start: endIndice.start, end: indice.end },
            entities: [],
            params: { type: token[0].slice(1, -1) },
          });

          pos = markerIndex;
        }
        break;
      }
      default: {
        throw new Error(`unknown token type: ${type}`);
      }
    }
  }
  parseLine({ start: text.length, end: text.length });

  return ({
    type: "text",
    innerSpan: { start: 0, end: text.length },
    outerSpan: { start: 0, end: text.length },
    entities: entities,
    params: {},
  });
}