/** Checks if `largeSpan` can contain `smallSpan` */
export declare function containsSpan(largeSpan: Span, smallSpan: Span): boolean;
/** Assertion util for the ts compiler to tell it that it should never happen */
export declare class UnreachableCaseError extends Error {
    constructor(val: never);
}
/** A span, similar to ranges in other languages */
export declare type Span = {
    start: number;
    end: number;
};
/** A generic type meant to make making entities easier and more consistent */
export declare type EntityType<N, T = {}> = {
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
export declare type Entity = EntityType<"text"> | EntityType<"bold"> | EntityType<"italic"> | EntityType<"underline"> | EntityType<"strikethrough"> | EntityType<"code"> | EntityType<"codeblock", {
    /** What language highlighting should be used to highlight the codeblock */
    lang?: string;
}> | EntityType<"blockquote", {
    /** Not currently used, only typed for spec complience */
    borderColor?: string;
}> | EntityType<"custom", {
    /** The custom expression type */
    type: string;
}>;
/** A marker used for identifying and matching tokens  */
export declare type Marker = {
    type: "bold" | "italic" | "underline" | "strikethrough" | "blockquote";
    span: Span;
};
/**
 * Parses a string into entities
 * @returns A root text entitiy, meant to make entity rendering easier
 */
export declare function parseMarkup(text: string): Entity;
