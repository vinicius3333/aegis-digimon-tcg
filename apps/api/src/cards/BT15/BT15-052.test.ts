import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-052.js";

describe("BT15-052", () => {
  it("retains inherited Piercing", () =>
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Piercing" }],
    }));
  it("returns a suspended opposing Digimon to deck bottom on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Return", to: "deckBottom", target: { filter: { suspended: true } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Return", to: "deckBottom" }],
    });
  });
  it("deletes itself at opponent end to play a non-Puppetmon Dark Masters", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    }));
});
