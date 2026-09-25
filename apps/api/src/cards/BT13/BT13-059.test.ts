import { dnaDigivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-059.js";
import { observe } from "../../engine/testkit/observe.js";
import { dnaDigivolveCostFor } from "../../engine/effects/primitives.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-059 Examon", () => {
  it("keeps DNA materials, same-target unsuspend restriction, and the once-per-turn modal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Green", level: 6 },
          { color: "Blue", level: 6 },
        ],
      },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: expect.arrayContaining([expect.objectContaining({ kind: "Suspend" })]),
    });
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions).toEqual([
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
        },
      ]);
    }
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [expect.objectContaining({ kind: "Modal", choose: 1, optional: true })],
        }),
      ],
    });
  });

  it("suspends an opponent Digimon on play and keeps the selected target restricted", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-059", as: "examon" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("examon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended, 3000);
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-4);
  });

  it("DNA digivolves from green Lv.6 + blue Lv.6 for 0 and enters unsuspended", async () => {
    expect(dnaDigivolutionRequirementsFor("BT13-059")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Green", level: 6 },
          { color: "Blue", level: 6 },
        ],
      },
    ]);
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-081", as: "green", suspended: true },
          { card: "BT20-027", as: "blue", suspended: true },
        ],
        hand: [{ card: "BT13-059", as: "examon" }],
        deck: [{ card: "BT1-010", as: "bonus" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-059"));
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT13-059")!;
    await settle();
    expect(result.isSuspended).toBe(false);
    expect(s.state.memory).toBe(4);
    expect(result.topCard.instanceId).toBe(s.inst("examon").instanceId);
    expect(result.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("green").instanceId, s.inst("blue").instanceId]),
    );
    expect(result.stack).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
  });

  it("rejects the unprinted Slayerdramon + Breakdramon pair and off-level materials", () => {
    const evolving = getCardDefinition("BT13-059")!;
    const green = getCardDefinition("BT1-081")!;
    const blue = getCardDefinition("BT20-027")!;
    const redBreakdramon = getCardDefinition("BT1-026")!;

    expect(dnaDigivolveCostFor(evolving, [green, blue])).toBe(0);
    expect(dnaDigivolveCostFor(evolving, [blue, redBreakdramon])).toBeUndefined();
    expect(dnaDigivolveCostFor(evolving, [{ ...green, level: 5 }, blue])).toBeUndefined();
  });

  it("resolves the All Turns modal once for public attacks and resets next opponent turn", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-059", as: "examon" },
            { card: "BT1-015", as: "ally", suspended: true },
            { card: "BT1-015", as: "allySecond", suspended: true },
          ],
          security: ["BT1-046", "BT1-046", "BT1-046"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: preferredTargets,
        preferOptionIndex: 1,
      },
    );
    preferredTargets.push(s.perm("ally").permanentId);
    await s.ready();
    const chooseOptionCount = () => s.decisions.filter((decision) => decision.req.kind === "chooseOption").length;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(chooseOptionCount()).toBe(1);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("allySecond").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(chooseOptionCount()).toBe(1);
    expect(s.perm("allySecond").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.perm("ally").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(chooseOptionCount()).toBe(2);
    expect(s.perm("ally").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextTurn;
  });
});
