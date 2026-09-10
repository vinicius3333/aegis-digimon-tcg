import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-035.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-035 Triceramon", () => {
  it("matches the catalog, Q3849, complete IR, alternate evolution, and exclusive registration", () => {
    expect(getCardDefinition("EX7-035")).toMatchObject({
      cardId: "EX7-035",
      nameEn: "Triceramon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Ceratopsian", "NSp", "Dinosaur"],
      effectText:
        "[Digivolve]Lv.4 w/[NSp] trait: Cost 3 \n\n[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. That Digimon can't unsuspend until the end of their turn.\n[Rule] Trait: Has the [Dinosaur] type.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon deletes an opponent's Digimon in battle, trash the top card of your opponent's security stack.",
    });
    expect(digivolutionRequirementsFor("EX7-035")).toContainEqual({
      level: 4,
      traits: ["NSp"],
      cost: 3,
      isAlternate: true,
    });
    const suspendAndLock = (trigger: "OnPlay" | "WhenDigivolving") => {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)?.actions).toEqual([
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "Restrict",
          target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ]);
    };
    suspendAndLock("OnPlay");
    suspendAndLock("WhenDigivolving");
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 4, traits: ["NSp"], cost: 3, isAlternate: true }],
      effects: expect.arrayContaining([
        {
          trigger: "Rule",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "trait",
              tokens: ["Dinosaur"],
            },
          ],
        },
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenDeletesInBattle",
              sourceFilter: { isSelfRef: true },
              actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ]),
    });
    expect(hasRegisteredCompiledCard("EX7-035")).toBe(true);
  });

  it("publicly plays, locks the same target through its turn, then expires before its following turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-035", as: "triceramon" }, "BT1-009"], deck: ["BT1-009", "BT1-011"] },
        1: { battleArea: [{ card: "EX7-014", as: "target" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("triceramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended && observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").isSuspended).toBe(false);
    await stopLoop(s, loop, 1);
  });

  it("Q3849: still locks the chosen Digimon when it is already suspended", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-035", as: "triceramon" }] },
        1: { battleArea: [{ card: "EX7-014", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("triceramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("alternate-evolves from a non-green NSp level 4 for 3 with exact draw/stack and locks the target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-018", as: "base" }],
          hand: [{ card: "EX7-035", as: "triceramon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const evolvedId = s.inst("triceramon").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: evolvedId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.instanceId === evolvedId &&
        observe(s.engine).isRestricted(s.perm("target"), "unsuspend"),
    );
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("rejects a wrong-color non-NSp level 4 without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-035", as: "base" }],
        hand: [{ card: "EX7-035", as: "triceramon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("triceramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.cardId).toBe("BT1-035");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("exposes the Dinosaur rule trait on a live card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-035", as: "triceramon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("triceramon"), "Dinosaur")).toBe(true);
  });

  it("inherits exact top-security trash once per turn and rearms after a real intervening turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "host", dp: 9000, under: ["EX7-035"] }],
          hand: ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
          deck: ["BT1-009", "BT1-011"],
          security: ["BT1-009", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 3000, suspended: true },
            { card: "BT1-011", as: "second", dp: 3000, suspended: true },
            { card: "EX7-028", as: "third", dp: 7000, suspended: true },
          ],
          security: [
            { card: "BT1-013", as: "securityTop" },
            { card: "BT1-014", as: "securityNext" },
            { card: "BT1-015", as: "securityLast" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const attack = (target: string) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm(target).permanentId },
      });
    const topSecurityId = s.inst("securityTop").instanceId;
    const nextSecurityId = s.inst("securityNext").instanceId;
    expect(attack("first")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === topSecurityId) && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(attack("second")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === nextSecurityId)).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("third").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("third").isSuspended);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(attack("third")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === nextSecurityId));
    expect(s.state.players[1]!.security).toHaveLength(1);
    await stopLoop(s, loop, 0);
  });
});
