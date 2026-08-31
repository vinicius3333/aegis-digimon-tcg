import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-139.js";

describe("P-139 Leomon (X Antibody)", () => {
  it("reduces an opponent's Digimon by 3000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-139", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 4000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);

    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    assertNoLoudGap(s);
  });

  it("encodes zero-cost Leomon digivolution and inherited Recovery", () => {
    expect(getCompiledCard("P-139")?.digivolutionRequirement).toEqual([
      { names: ["Leomon"], cost: 0, isAlternate: true },
    ]);
    expect(getCompiledCard("P-139")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnDeletion",
          isInherited: true,
          keywords: [{ keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" }],
        }),
      ]),
    );
  });

  it("applies -3000 DP on the live When Digivolving window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-139", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 4000 }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("grants Blocker and Fortitude while Leomon/X Antibody is in its stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-139", as: "source", under: ["BT9-050"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Fortitude")).toBe(true);
  });

  it("recovers the top deck card when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "source", under: ["P-139"] }], deck: ["BT1-001"] },
    });
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-001");
  });
});
