import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-018.js";

describe("EX7-018 Kokomon", () => {
  it("draws one on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Draw", amount: 1 });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Draw", amount: 1 });
  });
  it("inherits Jamming", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming"));
});
