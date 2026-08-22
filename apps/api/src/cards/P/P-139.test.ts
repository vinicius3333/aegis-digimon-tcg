import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-139.js";

describe("P-139 Leomon (X Antibody)", () => {
  it("reduces an opponent's Digimon by 3000 DP on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "P-139", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    assertNoLoudGap(s);
  });

  it("encodes zero-cost Leomon digivolution and inherited Recovery", () => {
    expect(getCompiledCard("P-139")?.digivolutionRequirement).toEqual([
      { names: ["Leomon"], cost: 0, isAlternate: true },
    ]);
    expect(getCompiledCard("P-139")?.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        keywords: [{ keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" }],
      }),
    ]));
  });
});
