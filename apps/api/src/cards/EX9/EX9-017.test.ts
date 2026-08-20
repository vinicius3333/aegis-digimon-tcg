import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-017.js";

describe("EX9-017", () => {
  it("has Training and trashes 1 opposing digivolution card by placing a card from hand face-down underneath on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, cost: { kind: "place", destination: "digivolutionStack", faceDown: true } });
  });
  it("inherits Jamming", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" }));
});
