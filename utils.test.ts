import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.89.0/testing/asserts.ts";
import { containsSpan, partition } from "./utils.ts";

Deno.test("containsSpan", () => {
  const largeSpan = { start: 0, end: 10 };
  const smallSpan = { start: 5, end: 7 };
  assert(
    containsSpan(largeSpan, smallSpan),
    "smallSpan was not inside of largeSpan",
  );
  assert(
    !containsSpan(smallSpan, largeSpan),
    "smallSpan cannot contain largeSpan",
  );

  const leftSpan = { start: -5, end: 5 };
  const rightSpan = { start: 5, end: 15 };
  assert(
    !containsSpan(leftSpan, rightSpan),
    "rightSpan cannot contain leftSpan",
  );
  assert(
    !containsSpan(rightSpan, leftSpan),
    "leftSpan cannot contain rightSpan",
  );

  assert(
    !containsSpan(largeSpan, leftSpan),
    "leftSpan is not fully inside of largeSpan",
  );
  assert(
    !containsSpan(largeSpan, rightSpan),
    "rightSpan is not fully inside of largeSpan",
  );
});

Deno.test("partion", () => {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const [evens, odds] = partition(nums, (n) => n % 2 === 0);

  assertEquals(evens, [2, 4, 6, 8, 10]);
  assertEquals(odds, [1, 3, 5, 7, 9]);
});
