import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-008.js";

describe("EX10-008 MetalGreymon", () => {
  it("grants the same opponent target Collision and a start-main-phase attack", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Greymon"], cost: 3, isAlternate: true }]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Collision" },
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
          {
            kind: "GainTriggeredEffect",
            gainedTrigger: "StartOfYourMainPhase",
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
            gainedActions: [{ kind: "Attack" }],
          },
        ],
      });
    }
  });

  it("models the inherited once-per-turn target-switch security trash and name gate", () => {
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              condition: { kind: "selfHasNameContaining", names: ["Greymon"] },
            },
          ],
        },
      ],
    });
  });

  it("grants Collision and a forced start-main attack to the same opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-008", as: "metalGreymon" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("metalGreymon"));
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("target"), "Collision") &&
        observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId).length === 1,
    );

    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(true);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(1);

    s.state.turnSeat = 1;
    s.perm("metalGreymon").isSuspended = true;
    await advance(s.engine).fireSubTrigger("startOfYourMainPhase");
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("digivolves from Greymon for 3 and exposes Reboot", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-007", as: "greymon", under: ["EX10-006", "EX10-002"] }],
          hand: [{ card: "EX10-008", as: "metalGreymon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("greymon").topCard.cardId === "EX10-008" && observe(s.engine).hasKeyword(s.perm("target"), "Collision"),
    );

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("greymon"), "Reboot")).toBe(true);
  });

  it("trashes the opponent's top security once when a Greymon-named host's attack target changes", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-010", as: "host", under: ["EX10-008"] }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => false, 30);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("does not trash security when the inherited host lacks Greymon in its name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX10-008"] }] },
      1: { security: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => false, 30);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("does not trash security on the controller's own turn ([Opponent's Turn] window)", async () => {
    // FAILS-WHEN-REVERTED: widening the inherited clause to AllTurns lets a Greymon host
    // strip security on both turns.
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-010", as: "host", under: ["EX10-008"] }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => false, 30);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
