import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle, settleAcrossTimers } from "./testkit/harness.js";

describe("ST15 Trident Arm Discord arena scenario", () => {
  it("announces the granted forced attack with its printed clause (Discord bug 1557482157012680795)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-st15-trident-arm-forced-attack-text", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-trident-arm" })).toEqual({ ok: true });
    const targetId = s.state.players[1]!.battleArea[0]!.permanentId;
    await settle(
      () =>
        observe(s.engine).customEffectGrants().length === 1 &&
        s.engine.state.pendingDecision === undefined &&
        s.state.phase === Phase.Main,
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.engine.state.pendingDecision === undefined);

    const grantedAnnouncements = s.events.flatMap((event) =>
      event.kind === "effectTriggered" && event.effectKey.startsWith("granted/") ? [event.description] : [],
    );
    const attacked = s.events.some(
      (event) => event.kind === "attackDeclared" && event.attackerPermanentId === targetId,
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(grantedAnnouncements).toEqual(["[Granted] [Start of Your Main Phase] This Digimon attacks."]);
    expect(attacked).toBe(true);
  });

  it("marks the Digimon that must attack for both players until the granted attack is spent", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-st15-trident-arm-forced-attack-text", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    const target = s.state.players[1]!.battleArea[0]!;
    expect(target.attacksAtStartOfMainPhase).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-trident-arm" })).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).customEffectGrants().length === 1 &&
        s.engine.state.pendingDecision === undefined &&
        s.state.phase === Phase.Main,
    );
    expect(target.attacksAtStartOfMainPhase).toBe(true);
    expect(JSON.parse(target.forcedAttackGrantsJson)).toEqual([
      { clause: "[Start of Your Main Phase] This Digimon attacks.", sourceCardId: "ST15-16" },
    ]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.engine.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const survivor = s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === target.permanentId);
    expect(survivor?.attacksAtStartOfMainPhase ?? false).toBe(false);
    expect(survivor?.forcedAttackGrantsJson ?? "").toBe("");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
