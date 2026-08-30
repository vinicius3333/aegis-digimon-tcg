import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-013.js";
import "../index.js";

describe("BT16-013", () => {
  it("has Blast Digivolve and reduces all opposing Digimon by 5000 on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "ModifyDP", target: { count: "all" }, amount: -5000 }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: -5000 }],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Silphymon"], cost: 3, isAlternate: true }]);
  });
  it("once per turn deletes an opposing 8000 DP or lower Digimon when security is removed, otherwise gains Security Attack +1", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [
            { kind: "Delete" },
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: 1 },
              condition: { kind: "ifThisEffectDidNotDelete" },
            },
          ],
        },
      ],
    }));

  it("reduces all opposing Digimon by 5000 on natural play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT16-013", as: "valkyrimon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 9000 },
          { card: "BT1-009", as: "second", dp: 7000 },
        ],
      },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("valkyrimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP === 4000 && s.perm("second").currentDP === 2000);

    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(2000);
  });

  it("reduces opposing Digimon by 5000 when naturally digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-012", as: "silphymon" }],
        hand: [{ card: "BT16-013", as: "valkyrimon" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 9000 },
          { card: "BT1-009", as: "second", dp: 7000 },
        ],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("silphymon").permanentId,
        instanceId: s.inst("valkyrimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("silphymon").topCard?.cardId === "BT16-013");

    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(2000);
  });

  it("deletes an opposing Digimon at the 8000 DP boundary when either player's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-013", as: "valkyrimon" }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 9000 },
            { card: "BT16-012", as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("grants Security Attack +1 when a security card is removed but no target is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-013", as: "valkyrimon" }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 9000 }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(observe(s.engine).hasKeyword(s.perm("valkyrimon"), "SecurityAttack")).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(9000);
  });
});
