import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { buildBotView } from "../bot/view.js";
import { createEvaluationPolicy } from "../bot/policy.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Discord 1555938104404348949 — playable DUAL Option immunity scenario", () => {
  it("1555938104404348949: evolves, attacks, passes, and removes the immune highest-DP Diarbbitmon with Eclipse Impact", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-diarbbitmon-dual-option-immunity", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-diarbbitmon",
        instanceId: "dev-diarbbitmon-evolution",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-052").length >= 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(true);
    expect(s.events.some((e) => e.kind === "attackDeclared" && e.attackerCardId === "EX12-052")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect("dev-perm-0-diarbbitmon", "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect("dev-perm-0-diarbbitmon", "beAffected", "Option")).toBe(false);
    expect(s.state.memory).toBe(5);
    const policy = createEvaluationPolicy();
    const intent = policy.chooseMainAction(buildBotView(s.state, 1)!);
    expect(intent).toMatchObject({ type: "playCard", instanceId: "dev-eclipse-impact" });
    expect(s.engine.applyIntent(1, intent)).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((c) => c.instanceId === "dev-eclipse-impact") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe("dev-diarbbitmon-evolution");
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
