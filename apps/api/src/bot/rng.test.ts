import { describe, expect, it } from "vitest";
import { createBotRandom, createBotRandomFromState } from "./rng.js";

describe("bot RNG handoff state", () => {
  it("continues with the identical sequence after exporting and importing state", () => {
    const original = createBotRandom(42);
    original.next();
    original.next();
    const restored = createBotRandomFromState(original.exportState());
    expect(Array.from({ length: 8 }, () => restored.next())).toEqual(Array.from({ length: 8 }, () => original.next()));
  });
});
