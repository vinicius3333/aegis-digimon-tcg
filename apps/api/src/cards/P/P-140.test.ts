import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-140.js";

describe("P-140 MegaKabuterimon", () => {
  it("reduces an opponent's Digimon by 3000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-140", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("encodes Evade, suspended immunity, Insectoid digivolution, and inherited security trash", () => {
    const compiled = getCompiledCard("P-140")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Evade", raw: "＜Evade＞" }] }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "immuneToOpponentDigimonEffects",
              duration: "permanent",
              condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenDeletesInBattle",
              sourceFilter: { isSelfRef: true },
              actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
            },
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Insectoid"], cost: 3, isAlternate: true }]);
  });

  it("trashes security when the inherited host itself wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "host", under: ["P-140"], dp: 12000 }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not react when another allied Digimon wins the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["P-140"], dp: 12000 },
          { card: "BT1-009", as: "ally", dp: 12000 },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: ["BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("exposes Evade on MegaKabuterimon itself", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-140", as: "mega" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mega"), "Evade")).toBe(true);
  });

  it("prevents an opponent Digimon effect from modifying its suspended DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-140", as: "mega", suspended: true, dp: 5000 }] },
      1: { battleArea: [{ card: "P-139", as: "enemy" }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("enemy"));
    await settle();
    expect(s.perm("mega").currentDP).toBe(5000);
  });
});
