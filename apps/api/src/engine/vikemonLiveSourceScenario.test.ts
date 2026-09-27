import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it("releases the Vikemon arena lock after legal evolution and locks later arrivals until turn end", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoDeclineOptional: true });
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-vikemon-live-source-lock");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const monodramon = human.battleArea.find((p) => p.topCard.cardId === "BT1-009")!;
    const gomamon = human.battleArea.find((p) => p.topCard.cardId === "BT1-030")!;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: monodramon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
    const counter = s.events.find((e) => e.kind === "counterWindowOpened");
    if (counter?.kind !== "counterWindowOpened") throw new Error("Counter did not open");
    const eligible = counter.eligibleCounters[0]!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible.instanceId,
        effectKey: eligible.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(gomamon, "suspend"));
    await advance(s.engine).finishAttack();
    expect(gomamon.stack).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: gomamon.permanentId, target: { kind: "player" } })
        .ok,
    ).toBe(false);
    const evolution = human.hand.find((c) => c.cardId === "BT1-037")!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: gomamon.permanentId,
        instanceId: evolution.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(gomamon.stack).toHaveLength(2);
    expect(observe(s.engine).isRestricted(gomamon, "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: gomamon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    // The resolved field effect survives its source leaving play.
    const vikemon = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT16-026")!;
    await advance(s.engine).verb.deletePermanent([vikemon.permanentId]);
    const newcomer = human.hand.find((c) => c.cardId === "BT1-030")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: newcomer.instanceId })).toEqual({ ok: true });
    await settle();
    const played = human.battleArea.find((p) => p.topCard.instanceId === newcomer.instanceId)!;
    expect(observe(s.engine).isRestricted(played, "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(played, "suspend")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1);
    expect(observe(s.engine).isRestricted(played, "suspend")).toBe(false);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
