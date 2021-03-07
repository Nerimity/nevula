import type { Span } from "./nevula.ts";

/** Assertion util for the ts compiler to tell it that it should never happen */
export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${JSON.stringify(val)}`);
  }
}

/** Checks if `largeSpan` can contain `smallSpan` */
export function containsSpan(largeSpan: Span, smallSpan: Span): boolean {
  return largeSpan.start < smallSpan.start && smallSpan.end < largeSpan.end;
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