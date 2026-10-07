import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

async function startHumanMain(s: ReturnType<typeof setupEngine>): Promise<{ loop: Promise<void> }> {
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { loop };
}

describe("October 7 Discord arena scenarios", () => {
  it("Discord 1557251527851114516: Reppamon's declined When Attacking cost keeps the top security card", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex5-reppamon-optional-cost", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const { loop } = await startHumanMain(s);
    const securityBefore = human.security.map(({ instanceId }) => instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-reppamon-attacker",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX5-029" && req.kind === "optional")).toBe(true);
    expect(human.security.map(({ instanceId }) => instanceId)).toEqual(securityBefore);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Discord 1557220124367396915: declining Dorimon's By cost pays no memory", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex13-dorimon-optional-cost", s.state, [BLUE_DECK, RED_DECK]);
    const host = () =>
      s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-dorimon-host")!;
    const { loop } = await startHumanMain(s);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-dorimon-host",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => s.state.pendingDecision === undefined && host().isSuspended);
    const eventsBeforeEnd = s.events.length;

    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1, 5000);

    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX13-006" && req.kind === "optional")).toBe(true);
    const endOfTurn = s.events.slice(eventsBeforeEnd);
    const turnEnded = endOfTurn.findIndex((event) => event.kind === "turnEnded");
    expect(turnEnded).toBeGreaterThanOrEqual(0);
    expect(
      endOfTurn.slice(0, turnEnded).filter((event) => event.kind === "memoryChanged" && event.reason !== "passTurn"),
    ).toEqual([]);
    expect(host().isSuspended).toBe(true);
    await settle(() => s.state.phase === Phase.Breeding, 5000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Discord 1557356892794388541: Giromon's block plays a 0 DP Gotsumon that is deleted before its [On Play]", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex13-giromon-zero-dp-play", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const { loop } = await startHumanMain(s);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding, 5000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: "dev-perm-1-giromon-king-etemon-a",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0, 5000);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: "dev-perm-0-giromon-blocker" })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "EX13-047")).toBe(true);
    expect(human.trash.some(({ instanceId }) => instanceId === "dev-giromon-gotsumon")).toBe(true);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX13-047")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
