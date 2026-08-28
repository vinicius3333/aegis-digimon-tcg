import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-046.js";

describe("BT18-046 Waspmon", () => {
  it("grants Insectoid and prevents only qualifying opposing Digimon from attacking players", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-046", as: "waspmon", suspended: true }] },
      1: {
        battleArea: [
          { card: "BT1-030", as: "smaller", dp: 3000 },
          { card: "BT1-030", as: "larger", dp: 5000 },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("waspmon"), "Insectoid")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("smaller"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("larger"), "attackPlayers")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("smaller").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("smaller").permanentId,
        target: { kind: "permanent", permanentId: s.perm("waspmon").permanentId },
      }).ok,
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not restrict attacks during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-046", as: "waspmon" }] },
      1: { battleArea: [{ card: "BT1-030", as: "smaller", dp: 3000 }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("smaller"), "attackPlayers")).toBe(false);
    assertNoLoudGap(s);
  });

  it.each([
    [true, 5000],
    [false, 4000],
  ])("face-up security=%s gives Royal Base Digimon %i DP", async (faceUp, expectedDp) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-046", as: "royalBase" }],
        security: [{ card: "BT18-046", as: "securityWaspmon", faceUp }],
      },
    });
    await s.ready();

    expect(s.perm("royalBase").currentDP).toBe(expectedDp);
    assertNoLoudGap(s);
  });

  it("digivolves from a level 3 Royal Base for 2 and preserves the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-044", as: "base" }],
        hand: [{ card: "BT18-046", as: "waspmon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("waspmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("waspmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT18-044"]);
    assertNoLoudGap(s);
  });

  it("grants its inherited host +1000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-046", as: "host", under: [{ card: "BT18-046", as: "source" }] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
