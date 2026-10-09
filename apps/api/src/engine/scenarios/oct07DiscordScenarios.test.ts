import { CATALOG_DECKS, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function startHumanMain(s: ReturnType<typeof setupEngine>): Promise<{ loop: Promise<void> }> {
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { loop };
}

describe("October 7 Discord arena scenarios", () => {
  it.each([
    { preset: "yes", accept: true },
    { preset: "no", accept: false },
    { preset: "ask", accept: true },
    { preset: "ask", accept: false },
  ])(
    "Discord 1557251527851114516: live Reppamon consent and two evolutions (preset=$preset, accept=$accept)",
    async ({ preset, accept }) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoOrderTriggers: false, autoSelectCards: true });
      // Match LiveArenaDemo's human deck; all proof cards are seeded independently of it.
      const demoDeck = CATALOG_DECKS.find(({ deckId }) => deckId === "bt26-dgo-2026-08-28-7-chronomon");
      if (demoDeck === undefined) throw new Error("Missing Chronomon demo deck");
      layDevScenario("arena-ex5-reppamon-optional-cost", s.state, [
        { mainDeck: [...demoDeck.decklist.mainDeck], eggDeck: [...demoDeck.decklist.eggDeck] },
        RED_DECK,
      ]);
      const human = s.state.players[0]!;
      const bot = s.state.players[1]!;
      const { loop } = await startHumanMain(s);
      try {
        const securityBefore = human.security.map(({ instanceId }) => instanceId);
        const trashBefore = human.trash.map(({ instanceId }) => instanceId);
        const attacker = human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-reppamon-attacker")!;
        const target = bot.battleArea.find(({ permanentId }) => permanentId === "dev-perm-1-reppamon-dp-target")!;
        expect(s.state.memory).toBe(6);
        expect(securityBefore).toEqual(["dev-reppamon-top-security", "dev-reppamon-second-security"]);
        expect(bot.security.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);
        expect(attacker.stack.map(({ cardId }) => cardId)).toEqual(["EX5-029"]);
        expect(target.currentDP).toBe(6000);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: attacker.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
        const order = s.decisions.at(-1)!.req;
        const keys = order.options!.triggerKeys!;
        const costIndex = order.options!.triggerDescriptions!.findIndex((text) => text.includes("By trashing"));
        expect(keys).toHaveLength(2);
        expect(costIndex).toBeGreaterThanOrEqual(0);
        expect(order.options!.triggerIsOptional![costIndex]).toBe(true);
        expect(order.options!.triggerIsOptional!.filter(Boolean)).toHaveLength(1);
        expect(human.security.map(({ instanceId }) => instanceId)).toEqual(securityBefore);
        expect(human.trash.map(({ instanceId }) => instanceId)).toEqual(trashBefore);
        const costKey = keys[costIndex]!;
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: order.decisionId,
            response: {
              kind: "orderTriggers",
              order: [costKey, ...keys.filter((key) => key !== costKey)],
              optionalAnswers: preset === "ask" ? {} : { [costKey]: accept },
            },
          }),
        ).toEqual({ ok: true });
        async function answerStandaloneConsent(): Promise<void> {
          await settle(() => s.state.pendingDecision?.kind === "optional");
          const consent = s.decisions.at(-1)!.req;
          expect(consent.sourceCardId).toBe("EX5-029");
          expect(human.security.map(({ instanceId }) => instanceId)).toEqual(securityBefore);
          expect(human.trash.map(({ instanceId }) => instanceId)).toEqual(trashBefore);
          expect(s.state.memory).toBe(6);
          expect(target.currentDP).toBe(6000);
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: consent.decisionId,
              response: { kind: "optional", accept },
            }),
          ).toEqual({ ok: true });
        }
        if (preset === "ask") await answerStandaloneConsent();
        await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);
        const securityAfter = accept ? securityBefore.slice(1) : securityBefore;
        const trashAfter = accept ? [...trashBefore, securityBefore[0]!] : trashBefore;
        expect(human.security.map(({ instanceId }) => instanceId)).toEqual(securityAfter);
        expect(human.trash.map(({ instanceId }) => instanceId)).toEqual(trashAfter);
        expect(s.state.memory).toBe(6);
        expect(target.currentDP).toBe(4000);
        expect(bot.security).toHaveLength(1);
        expect(human.battleArea).toContain(attacker);

        for (const [index, suffix] of ["a", "b"].entries()) {
          const base = human.battleArea.find(
            ({ permanentId }) => permanentId === `dev-perm-0-reppamon-base-${suffix}`,
          )!;
          expect(base.topCard.cardId).toBe("BT1-050");
          expect(
            s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: base.permanentId,
              instanceId: `dev-reppamon-evolution-${suffix}`,
            }),
          ).toEqual({ ok: true });
          await settle(() => base.topCard.cardId === "BT1-051" && s.state.pendingDecision === undefined);
          expect(s.state.memory).toBe((accept ? 6 : 4) - index * 2);
          expect(base.stack.map(({ cardId }) => cardId)).toEqual(["BT1-050"]);
          expect(human.security.map(({ instanceId }) => instanceId)).toEqual(securityAfter);
          expect(human.trash.map(({ instanceId }) => instanceId)).toEqual(trashAfter);
        }
        expect(human.hand.some(({ instanceId }) => instanceId === "dev-reppamon-hand-witness")).toBe(true);
        expect(s.state.turnSeat).toBe(0);
        expect(s.state.phase).toBe(Phase.Main);
        expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers")).toHaveLength(1);
        expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(preset === "ask" ? 1 : 0);
        expect(s.decisions.every(({ req }) => req.sourceCardId === "EX5-029")).toBe(true);
      } finally {
        expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
        await loop;
      }
    },
  );

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
