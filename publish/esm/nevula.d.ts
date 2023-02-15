/** Checks if `largeSpan` can contain `smallSpan` */
export declare function containsSpan(largeSpan: Span, smallSpan: Span): boolean;
/** Assertion util for the ts compiler to tell it that it should never happen */
export declare class UnreachableCaseError extends Error {
    constructor(val: never);
}
/** Partition a list into two parts based on a boolean: `[true, false]` */
export declare function partition<T>(list: T[], filter: (item: T) => boolean): [T[], T[]];
/** Returns the index of the last element in the array where predicate is true, and -1 otherwise.  */
export declare function findLastIndex<T>(list: T[], predicate: (item: T) => boolean): number;
/** A span, similar to ranges in other languages */
export type Span = {
    start: number;
    end: number;
};
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
export type Entity = EntityType<"text"> | EntityType<"link"> | EntityType<"bold"> | EntityType<"italic"> | EntityType<"spoiler"> | EntityType<"underline"> | EntityType<"strikethrough"> | EntityType<"code"> | EntityType<"emoji"> | EntityType<"emoji_name"> | EntityType<"codeblock", {
    /** What language highlighting should be used to highlight the codeblock */
    lang?: string;
}> | EntityType<"blockquote", {
    /** Not currently used, only typed for spec complience */
    borderColor?: string;
}> | EntityType<"color", {
    color: "reset" | `#${string}`;
}> | EntityType<"custom", {
    /** The custom expression type */
    type: string;
}>;
/** A marker used for identifying and matching tokens  */
export type Marker = {
    type: "bold" | "italic" | "underline" | "spoiler" | "strikethrough" | "blockquote" | "color";
    span: Span;
    data?: string;
};
/**
 * Parses a string into entities
 * @returns A root text entitiy, meant to make entity rendering easier
 */
export declare function parseMarkup(text: string): Entity;
/** modifies an entity's entities to add text spans */
export declare function addTextSpans(entity: Entity): Entity;
