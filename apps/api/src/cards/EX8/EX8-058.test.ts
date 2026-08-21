import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-058.js";

describe("EX8-058", () => {
  it("gains 1 memory on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
    }));
  it("contains only the printed deletion effect", () => expect(compiled.effects).toHaveLength(1));
});
