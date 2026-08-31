import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-035.js";
import "../index.js";

describe("BT16-035", () => {
  it("grants itself the Angel trait", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }],
      keywords: [{ keyword: "Barrier" }, { keyword: "Reboot" }],
    });
  });

  it("has Barrier, Reboot, and an optional once-per-turn unsuspend after security removal", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [{ kind: "Unsuspend", optional: true }],
    });
  });

  it("encodes both catalog alternate evolution routes", () => {
    const requirements = [
      { colors: ["Yellow"], level: 5, cost: 3, isAlternate: true },
      { colors: ["Black"], level: 5, cost: 3, isAlternate: true },
    ];

    expect(compiled.digivolutionRequirement).toEqual(requirements);
    expect(digivolutionRequirementsFor("BT16-035")).toEqual(requirements);
  });

  it("grants the printed Angel rule trait and keywords on a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-035", as: "slash" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("slash"), "Angel")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("slash"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("slash"), "Reboot")).toBe(true);
  });

  it("naturally unsuspends when an opponent removes a card from its security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-035", as: "slash", suspended: true }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("slash").isSuspended).toBe(false);
  });

  it("does not unsuspend for the opponent's security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-035", as: "slash", suspended: true },
            { card: "BT1-009", as: "attacker" },
          ],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("slash").isSuspended).toBe(true);
  });

  it("uses Barrier to survive a natural losing battle by trashing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-035", as: "slash", suspended: true }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT16-036", as: "chaosmon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("chaosmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("slash").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision);

    expect(
      s.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: s.perm("slash").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("slash").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("naturally reboots during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-035", as: "slash", suspended: true }], deck: ["BT1-009"] },
      1: { deck: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("slash").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it.each([
    ["BT16-034", "yellowBase"],
    ["BT16-062", "blackBase"],
  ] as const)("naturally evolves from the %s Lv.5 route for 3 memory", async (base, alias) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: alias }],
        hand: [{ card: "BT16-035", as: "slash" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(alias).permanentId,
        instanceId: s.inst("slash").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm(alias).topCard?.cardId === "BT16-035");

    expect(s.perm(alias).stack.map((card) => card.cardId)).toEqual([base]);
    expect(s.state.memory).toBe(0);
  });
});
