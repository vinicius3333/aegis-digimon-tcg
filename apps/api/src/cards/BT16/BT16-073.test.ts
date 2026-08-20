import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-073.js";

describe("BT16-073", () => {
  it("models Retaliation and draws two then trashes two on play", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", keywords: [{ keyword: "Retaliation" }], actions: [{ kind: "Draw", amount: 2 }, { kind: "Trash", target: { count: 2 } }] });
  });

  it("plays a Myotismon-text Tamer from trash on deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", payCost: false, target: { count: 1, location: "trash", controller: "mine" } }] });
  });
});
