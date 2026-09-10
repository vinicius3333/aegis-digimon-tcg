import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX7-004.js";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-004 Fluffymon", () => {
  it("matches the catalog and compiles the complete inherited clause", () => {
    expect(getCardDefinition("EX7-004")).toMatchObject({
      cardId: "EX7-004",
      nameEn: "Fluffymon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Mini Bird", "LIBERATOR"],
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, gain 1 memory.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
  });

  it("inherits once-per-turn memory when an effect deletes in battle", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));

  it("gains exactly 1 memory when its stacked host deletes an opposing Digimon in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", dp: 4000, under: ["EX7-004"], as: "host" },
          { card: "BT1-009", dp: 4000, as: "secondHost" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", dp: 3000, suspended: true, as: "firstDefender" },
          { card: "BT1-009", dp: 3000, suspended: true, as: "secondDefender" },
        ],
      },
    });
    const firstDefender = s.perm("firstDefender");
    const secondDefender = s.perm("secondDefender");
    await s.ready();
    s.state.memory = 3;
    const attacker = s.perm("host");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: firstDefender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 4 &&
        s.events.some(
          (event) => event.kind === "combatResolved" && event.deletedPermanentIds?.includes(firstDefender.permanentId),
        ),
    );
    expect(s.state.memory).toBe(4);

    // The source filter is self-scoped: a different attacker deleting in battle does not trigger
    // the inherited watcher on the stacked host.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some(
        (event) => event.kind === "combatResolved" && event.deletedPermanentIds?.includes(secondDefender.permanentId),
      ),
    );
    expect(s.state.memory).toBe(4);

    assertNoLoudGap(s);
  });

  it("does not gain memory when the battle does not delete the opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 4000, under: ["EX7-004"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 5000, suspended: true, as: "defender" }] },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.state.memory).toBe(3);
  });

  it("re-arms the inherited once-per-turn watcher after a real turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", dp: 4000, under: ["EX7-004"], as: "host" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", dp: 3000, suspended: true, as: "firstDefender" },
          { card: "BT1-009", dp: 3000, suspended: true, as: "secondDefender" },
          { card: "BT1-009", dp: 3000, suspended: true, as: "nextTurnDefender" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const firstTurnMemory = s.state.memory;
    const firstDefenderId = s.perm("firstDefender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: firstDefenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstDefenderId));
    expect(s.state.memory).toBe(firstTurnMemory + 1);

    // No public main-phase action unsuspends an arbitrary host. This named production test seam
    // supplies only that rule-state bridge; both deletion events remain real public attacks.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    const secondDefenderId = s.perm("secondDefender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: secondDefenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondDefenderId));
    expect(s.state.memory).toBe(firstTurnMemory + 1);

    // The public main phase has no arbitrary unsuspend action, so run the actual turn machine
    // across the opponent's turn and back to the owner to reset the per-turn ledger.
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    const nextTurnWatcher = advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenDeletesInBattle")[0];
    expect(nextTurnWatcher?.oncePerTurnKey).toBeDefined();
    expect(advance(s.engine).ledgers.tracker.count(nextTurnWatcher!.oncePerTurnKey!, "subtrigger")).toBe(0);
    const nextTurnMemory = s.state.memory;
    await advance(s.engine).verb.suspend([s.perm("nextTurnDefender").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("nextTurnDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("nextTurnDefender").permanentId),
    );
    expect(s.state.memory).toBe(nextTurnMemory + 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("carries the inherited trigger through hatch -> zero-cost digivolve -> raise and proves the draw", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX7-004", as: "egg" }],
        hand: [{ card: "BT1-064", as: "evolver" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-009", dp: 2000, suspended: true, as: "defender" }],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX7-004");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    const deckBeforeDigivolve = s.state.players[0]!.deck.length;
    const bonusDrawInstanceId = s.state.players[0]!.deck[0]!.instanceId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-064");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeDigivolve - 1);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === bonusDrawInstanceId)).toBe(true);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("evolver").instanceId)).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard?.cardId).toBe("BT1-064");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    await advance(s.engine).waitForMainPhase(0);
    // The intervening real turn correctly unsuspends the defender. This named production seam
    // restores the battle fixture; the deletion and inherited trigger remain a public attack.
    await advance(s.engine).verb.suspend([s.perm("defender").permanentId]);
    const memoryBeforeBattle = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === memoryBeforeBattle + 1);
    expect(s.state.memory).toBe(memoryBeforeBattle + 1);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects the same green evolution from a red Digi-Egg source without paying or drawing", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-001", as: "wrongEgg" }],
        hand: [{ card: "BT1-064", as: "evolver" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010"] },
    });
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-001");
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    const memoryBefore = s.state.memory;
    const deckBefore = s.state.players[0]!.deck.length;
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.breeding!.stack).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
