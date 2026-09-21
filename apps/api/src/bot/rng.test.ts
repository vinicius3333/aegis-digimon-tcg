import { describe, expect, it } from "vitest";
import { createBotRandom } from "./rng.js";

describe("seeded bot RNG", () => {
  it("produces the same sequence for the same seed", () => {
    const first = createBotRandom(42);
    const second = createBotRandom(42);

    expect(Array.from({ length: 8 }, () => first.next())).toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
  });

  it("produces a distinct sequence for a different seed", () => {
    const first = createBotRandom(42);
    const second = createBotRandom(43);

    expect(Array.from({ length: 8 }, () => first.next())).not.toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
  });
});
