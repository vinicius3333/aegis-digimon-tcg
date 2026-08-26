import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-031.js";

describe("BT10-031 Pulsemon", () => {
  it("encodes the opponent-turn security aura and exact Bibimon alternate evolution", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OpponentsTurn",
        actions: [
          expect.objectContaining({
            kind: "Aura",
            effect: expect.objectContaining({
              kind: "keyword",
              keyword: expect.objectContaining({ keyword: "Blocker" }),
            }),
            while: expect.objectContaining({ kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 }),
          }),
        ],
      }),
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Bibimon"], cost: 0, isAlternate: true }]);
  });

  it("has Blocker only on the opponent's turn at 3 or fewer security", async () => {
    const atThree = setupEngine({
      0: { battleArea: [{ card: "BT10-031", as: "pulsemon" }], security: 3 },
    });
    await atThree.engine.recomputeContinuousEffects();
    expect(observe(atThree.engine).hasKeyword(atThree.perm("pulsemon"), "Blocker")).toBe(false);

    atThree.state.turnSeat = 1;
    await atThree.engine.recomputeContinuousEffects();
    expect(observe(atThree.engine).hasKeyword(atThree.perm("pulsemon"), "Blocker")).toBe(true);

    const atFour = setupEngine({
      0: { battleArea: [{ card: "BT10-031", as: "pulsemon" }], security: 4 },
    });
    atFour.state.turnSeat = 1;
    await atFour.engine.recomputeContinuousEffects();
    expect(observe(atFour.engine).hasKeyword(atFour.perm("pulsemon"), "Blocker")).toBe(false);
    assertNoLoudGap(atThree);
    assertNoLoudGap(atFour);
  });

  it("gains Blocker live after an opponent's attack lowers security from 4 to 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-031", as: "pulsemon" }],
        security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("pulsemon"), "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && !observe(s.engine).isAttacking());

    expect(observe(s.engine).hasKeyword(s.perm("pulsemon"), "Blocker")).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves for 0 from a green Bibimon but not from another green DigiEgg", () => {
    const namedBase = setupEngine({
      0: {
        battleArea: [{ card: "BT8-004", as: "bibimon" }],
        hand: [{ card: "BT10-031", as: "pulsemon" }],
      },
    });
    namedBase.state.memory = 0;
    expect(
      namedBase.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: namedBase.perm("bibimon").permanentId,
        instanceId: namedBase.inst("pulsemon").instanceId,
      }),
    ).toEqual({ ok: true });
    expect(namedBase.state.memory).toBe(0);

    const genericBase = setupEngine({
      0: {
        battleArea: [{ card: "BT6-004", as: "otherEgg" }],
        hand: [{ card: "BT10-031", as: "pulsemon" }],
      },
    });
    genericBase.state.memory = 0;
    expect(
      genericBase.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: genericBase.perm("otherEgg").permanentId,
        instanceId: genericBase.inst("pulsemon").instanceId,
      }).ok,
    ).toBe(false);
    expect(genericBase.state.memory).toBe(0);
    assertNoLoudGap(namedBase);
    assertNoLoudGap(genericBase);
  });
});
