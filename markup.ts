// generated from: https://github.com/brecert/unicode-emoji-regex
const EMOJI_SEQUENCE =
  /(?:(?:(?:(?:\p{Emoji})(?:\u{FE0F}))|(?:(?:\p{Emoji_Modifier_Base})(?:\p{Emoji_Modifier}))|(?:\p{Emoji}))(?:[\u{E0020}-\u{E007E}]+)(?:\u{E007F}))|(?:(?:(?:(?:\p{Emoji_Modifier_Base})(?:\p{Emoji_Modifier}))|(?:(?:\p{Emoji})(?:\u{FE0F}))|(?:\p{Emoji}))(?:(?:\u{200d})(?:(?:(?:\p{Emoji_Modifier_Base})(?:\p{Emoji_Modifier}))|(?:(?:\p{Emoji})(?:\u{FE0F}))|(?:\p{Emoji})))+)|(?:(?:(?:\p{Regional_Indicator})(?:\p{Regional_Indicator}))|(?:(?:\p{Emoji_Modifier_Base})(?:\p{Emoji_Modifier}))|(?:[0-9#*]\u{FE0F}\u{20E3})|(?:(?:\p{Emoji})(?:\u{FE0F})))/u;

/** Checks if `largeSpan` can contain `smallSpan` */
export function containsSpan(largeSpan: Span, smallSpan: Span): boolean {
  return largeSpan.start <= smallSpan.start && smallSpan.end <= largeSpan.end;
}

/** Assertion util for the ts compiler to tell it that it should never happen */
export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${JSON.stringify(val)}`);
  }
}

/** Partition a list into two parts based on a boolean: `[true, false]` */
export function partition<T>(list: T[], filter: (item: T) => boolean) {
  let result: [T[], T[]] = [[], []];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (filter(item)) {
      result[0].push(item);
    } else {
      result[1].push(item);
    }
  }
  return result;
}

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
  | EntityType<"link">
  | EntityType<"bold">
  | EntityType<"italic">
  | EntityType<"underline">
  | EntityType<"strikethrough">
  | EntityType<"code">
  | EntityType<"emoji">
  | EntityType<"emoji_name">
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
    "gu",
  );
};

function generateMapping<T extends string>(parts: Record<T, RegExp>): T[] {
  return [...Object.keys(parts)] as T[];
}

const TOKEN_PARTS = {
  escape: /\\[\\*/_~`\[\]]/,
  bold: /\*\*/,
  italic: /\/\//,
  underline: /__/,
  strikethrough: /~~/,
  codeblock: /```/,
  code: /``/,
  link: /https?:\/\/\S+\.[\p{Alphabetic}\\=+&%@;!._~-]+/,
  emoji: new RegExp(
    String.raw
      `${EMOJI_SEQUENCE.source}|\p{Emoji_Presentation}|\p{Extended_Pictographic}`,
    "u",
  ),
  custom_start: /\[(?:.|\w+):/,
  custom_end: /\]/,
  emoji_name: /:\w+:/,
  newline: /\r?\n/,
};

// todo: manually do this
const TOKENS = generateRegex(TOKEN_PARTS);
const TYPES = generateMapping(TOKEN_PARTS);

function tokenType(token: RegExpMatchArray) {
  return TYPES[token.findIndex((g, i) => i != 0 && g != null) - 1];
}

/** A marker used for identifying and matching tokens  */
export type Marker = {
  type: "bold" | "italic" | "underline" | "strikethrough" | "blockquote";
  span: Span;
};

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
        span: { start: indice.start, end: indice.end + 2 },
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
      case "emoji_name": {
        entities.push({
          type,
          innerSpan: { start: indice.start + 1, end: indice.end - 1 },
          outerSpan: indice,
          entities: [],
          params: {},
        });
        break;
      }
      case "emoji": {
        entities.push({
          type,
          innerSpan: indice,
          outerSpan: indice,
          entities: [],
          params: {},
        });
        break;
      }
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
          const escapes = tokens.slice(pos, markerIndex).filter((e) =>
            tokenType(e) === "escape"
          );
          const endToken = tokens[markerIndex];
          const endIndice: Span = {
            start: endToken.index!,
            end: endToken.index! + endToken[0].length,
          };

          // todo: write a better system that's more generalized for escaping
          entities.push({
            type: "code",
            innerSpan: { start: indice.end, end: endIndice.start },
            outerSpan: { start: indice.start, end: endIndice.end },
            entities: escapes.map((m) => ({
              type: "text",
              innerSpan: { start: m.index! + 1, end: m.index! + m[0].length },
              outerSpan: { start: m.index!, end: m.index! + m[0].length },
              entities: [],
              params: {},
            })),
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
          const escapes = tokens.slice(pos, markerIndex).filter((e) =>
            tokenType(e) === "escape"
          );
          const endToken = tokens[markerIndex];
          const endIndice: Span = {
            start: endToken.index!,
            end: endToken.index! + endToken[0].length,
          };
          // get lang param
          const langRegex = /\w*\r?\n/y;
          langRegex.lastIndex = indice.end;
          const args = langRegex.exec(text);
          // remove the \n
          const lang = args?.[0]?.trim();

          entities.push({
            type: "codeblock",
            // add the lang length to the innerSpan start to skip that when getting the text
            innerSpan: {
              start: indice.end + (args?.[0]?.length ?? 0),
              end: endIndice.start,
            },
            outerSpan: { start: indice.start, end: endIndice.end },
            entities: escapes.map((m) => ({
              type: "text",
              innerSpan: { start: m.index! + 1, end: m.index! + m[0].length },
              outerSpan: { start: m.index!, end: m.index! + m[0].length },
              entities: [],
              params: {},
            })),
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
          const escapes = tokens.slice(pos, markerIndex).filter((e) =>
            tokenType(e) === "escape"
          );
          const endToken = tokens[markerIndex];
          const endIndice: Span = {
            start: endToken.index!,
            end: endToken.index! + endToken[0].length,
          };

          entities.push({
            type: "custom",
            innerSpan: { start: indice.end, end: endIndice.start },
            outerSpan: { start: indice.start, end: endIndice.end },
            entities: escapes.map((m) => ({
              type: "text",
              innerSpan: { start: m.index! + 1, end: m.index! + m[0].length },
              outerSpan: { start: m.index!, end: m.index! + m[0].length },
              entities: [],
              params: {},
            })),
            params: { type: token[0].slice(1, -1) },
          });

          pos = markerIndex;
        }
        break;
      }
      case "link": {
        entities.push({
          type: "link",
          innerSpan: indice,
          outerSpan: indice,
          entities: [],
          params: {},
        });
        break;
      }
      case "escape": {
        const span = { start: indice.start + 1, end: indice.end };
        entities.push({
          type: "text",
          innerSpan: span,
          outerSpan: indice,
          entities: [],
          params: {},
        });
        break;
      }
      // skip custom_end, it's not used for matching anything behind it
      case "custom_end":
        break;
      default:
        throw new UnreachableCaseError(type);
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

/** modifies an entity's entities to add text spans */
export function addTextSpans(entity: Entity): Entity {
  if (entity.entities.length === 0 && entity.type === "text") {
    return entity;
  }

  let entities: Entity[] = [];

  for (let i = 0; i < entity.entities.length; i++) {
    const e = entity.entities[i];

    const textSpan = {
      start: entities[entities.length - 1]?.outerSpan.end ??
        entity.innerSpan.start,
      end: e.outerSpan.start,
    };

    if (textSpan.end > textSpan.start) {
      entities.push({
        type: "text",
        innerSpan: textSpan,
        outerSpan: textSpan,
        entities: [],
        params: {},
      });
    }

    entities.push(addTextSpans(e));
  }

  const endingTextSpan = {
    start: entity.entities[entity.entities.length - 1]?.outerSpan.end ??
      entity.innerSpan.start,
    end: entity.innerSpan.end,
  };

  if (endingTextSpan.end > endingTextSpan.start) {
    entities.push({
      type: "text",
      innerSpan: endingTextSpan,
      outerSpan: endingTextSpan,
      entities: [],
      params: {},
    });
  }

  return { ...entity, entities };
}
