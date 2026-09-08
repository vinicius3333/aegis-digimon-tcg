import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX10-002.js";

/**
 * EX10-002 Koromon (Digi-Egg, Black, Lv.2 In-Training, [Lesser]).
 * Inherited: "[All Turns] [Once Per Turn] When attack targets change, ＜Draw 1＞".
 *
 * The attack target changes naturally when a ＜Blocker＞ is declared, so every clause below
 * is proved through the production block window (`declareBlock`), not injected timing.
 */
describe("EX10-002 Koromon inherited draw when attack targets change", () => {
  it("matches the catalog: a Black Lv.2 [Lesser] Digi-Egg whose only text is inherited", () => {
    expect(getCardDefinition("EX10-002")).toMatchObject({
      cardId: "EX10-002",
      nameEn: "Koromon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText: "[All Turns] [Once Per Turn] When attack targets change, ＜Draw 1＞",
    });
    const definition = getCardDefinition("EX10-002")!;
    expect(definition.effectText ?? "").toBe("");
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("draws 1 when the opponent blocks this Digimon's attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", dp: 20_000, under: [{ card: "EX10-002", as: "koromon" }] }],
        deck: ["BT1-013", "BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-010"] },
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    const handBefore = p0.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.length === handBefore + 1);

    // The draw took the top card of the deck; security was never checked because the attack
    // was redirected onto the blocker, which the 20000 DP host deletes.
    expect(p0.hand.length).toBe(handBefore + 1);
    expect(p0.hand.at(-1)!.cardId).toBe("BT1-013");
    expect(p0.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX10-002"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("does not draw when the attack resolves unblocked: no target change, no trigger", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", dp: 20_000, under: ["EX10-002"] }],
        deck: ["BT1-013", "BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-010"] },
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    const handBefore = p0.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(p0.hand.length).toBe(handBefore);
    expect(p0.deck.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Once Per Turn]: a second block in the same turn does not draw again", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", dp: 20_000, under: [{ card: "EX10-002", as: "koromon" }] },
          { card: "BT1-013", as: "second", dp: 20_000 },
        ],
        deck: ["BT1-013", "BT1-014", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-031", as: "blockerA" },
          { card: "BT1-031", as: "blockerB" },
        ],
        security: ["BT1-010"],
      },
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    const handBefore = p0.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blockerA").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.length === handBefore + 1);
    expect(p0.hand.length).toBe(handBefore + 1);

    // Second attack, same turn, second target change. The watcher is unscoped (it reacts to
    // ANY attack-target change, not only its own host's), so only [Once Per Turn] can stop it.
    const blockedAgain = s.events.filter((event) => event.kind === "blocked").length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blockerB").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blocked").length > blockedAgain);
    await settle(() => false, 30);

    expect(s.events.filter((event) => event.kind === "blocked")).toHaveLength(2);
    expect(p0.hand.length).toBe(handBefore + 1);
    expect(p0.deck.map((card) => card.cardId)).toEqual(["BT1-014", "BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[All Turns]: fires on the opponent's turn too, and the once-per-turn use resets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", dp: 20_000, under: [{ card: "EX10-002", as: "koromon" }] },
          { card: "BT1-031", as: "myBlocker" },
        ],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
        hand: ["BT1-013"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-031", as: "theirBlocker" },
          { card: "BT1-013", as: "theirAttacker", dp: 20_000 },
        ],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        hand: ["BT1-013"],
        security: ["BT1-009", "BT1-010"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const p0 = s.state.players[0]!;
    const handAfterDraw = p0.hand.length;

    // Own turn: my attack is blocked, the target changes, I draw.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("theirBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.length === handAfterDraw + 1);
    expect(p0.hand.length).toBe(handAfterDraw + 1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const handAtOpponentTurn = p0.hand.length;

    // Opponent's turn: THEY attack, I block. The switch is theirs, but the draw belongs to
    // the controller of the Digimon carrying Koromon, and the once-per-turn use has reset.
    const theirHandBefore = s.state.players[1]!.hand.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("theirAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("myBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.length === handAtOpponentTurn + 1);

    expect(p0.hand.length).toBe(handAtOpponentTurn + 1);
    expect(s.state.players[1]!.hand.length).toBe(theirHandBefore);
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("carries its inherited draw through a real breeding stack: egg -> Lv.3 -> battle area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX10-002", as: "egg" },
        hand: [{ card: "BT2-052", as: "hagurumon" }],
        deck: ["BT1-013", "BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-010"] },
    });
    s.state.memory = 0;
    await s.ready();
    const eggInstanceId = s.inst("egg").instanceId;
    const eggPermanentId = s.perm("egg").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("hagurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-052");
    // Digivolving costs 0 memory from a Lv.2 to BT2-052 and draws the usual 1 card, so the
    // hand is read again after the move and only the inherited draw is measured below.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);

    // `moveFromBreeding` is gated on the Breeding phase; the turn loop is not running here,
    // so the phase is set directly and restored, exactly as BT23-040's helper does.
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    s.state.phase = Phase.Main;
    const bred = s.state.players[0]!.battleArea[0]!;
    expect(bred.topCard!.cardId).toBe("BT2-052");
    expect(bred.stack.map((card) => card.cardId)).toEqual(["EX10-002"]);
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: bred.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);

    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("records the inherited [All Turns] once-per-turn contract", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
