import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Discord 1555578375677018193 arena scenarios", () => {
  it("BT25 BeelStarmon's unsuspend cost fires Hurricane Screw Shot's memory gain", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Use an Option", "Arts Digivolve"] },
    );
    layDevScenario("arena-bt25-beelstarmon-option-trash-trigger", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const beelStarmon = human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-beelstarmon-bt25")!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: beelStarmon.permanentId,
        target: { kind: "permanent", permanentId: "dev-perm-1-beelstarmon-bt25-target" },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);
    const unsuspended = !beelStarmon.isSuspended;
    const screwShotTrashed = human.trash.some(({ cardId }) => cardId === "EX7-071");
    const memory = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(unsuspended).toBe(true);
    expect(screwShotTrashed).toBe(true);
    expect(memory).toBe(6);
  });

  it("EX7 Deputymon's trash fires Bind Red Trigger's deletion", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex7-deputymon-option-trash-trigger", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-deputymon-base",
        instanceId: "dev-deputymon",
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);
    const bindRedTrashed = human.trash.some(({ cardId }) => cardId === "P-180");
    const memory = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(bindRedTrashed).toBe(true);
    expect(opponent.trash.some(({ instanceId }) => instanceId === "dev-field-1-deputymon-target")).toBe(true);
    expect(memory).toBe(3);
  });
});
