import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-038.js";

describe("BT16-038", () => {
  it("reduces the cost of its own Gargomon or Rapidmon digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Replacement", event: "wouldDigivolve", actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }] }] });
  });

  it("grants inherited Piercing to Gargomon or Rapidmon", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } }] });
  });
});
