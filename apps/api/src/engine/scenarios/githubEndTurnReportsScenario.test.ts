import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function start(id: DevScenarioId, preferTriggerKeys: string[] = []) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferTriggerKeys,
      declinePrompts: id === "arena-github-5305-gravity-order" ? ["Attack", "attack", "Battle", "battle"] : [],
    },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return s;
}

async function endAtOpponentBreeding(s: Awaited<ReturnType<typeof start>>) {
  await settle(
    () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
  );
}

describe("GitHub end-of-turn playable arenas", () => {
  it("#5302: Kunlun stays unsuspended after Shishimamon evolves on the security check", async () => {
    const s = await start("arena-github-5302-kunlun-security-check");
    try {
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await endAtOpponentBreeding(s);
      const revealed = s.events.findIndex((event) => event.kind === "securityRevealed");
      const evolved = s.events.findIndex((event) => event.kind === "digivolved" && event.cardId === "EX12-065");
      expect(revealed).toBeGreaterThanOrEqual(0);
      expect(evolved).toBeGreaterThan(revealed);
      const kunlun = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT26-104")!;
      expect(kunlun.isSuspended).toBe(false);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === "dev-eot-arrival")).toBe(true);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it.each([true, false])("#5305: the arena respects memory-loss-first=%s", async (memoryFirst) => {
    const s = await start("arena-github-5305-gravity-order", [memoryFirst ? "BT1-090" : "BT24-085"]);
    try {
      expect(s.state.memory).toBe(4);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-eot-gravity" })).toEqual({ ok: true });
      await settle(() => s.state.memory === 6 && s.state.pendingDecision === undefined);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-eot-vulcanus" })).toEqual({ ok: true });
      await endAtOpponentBreeding(s);
      const order = s.decisions.find(
        ({ req }) => req.kind === "orderTriggers" && req.options?.triggerCardIds?.includes("BT1-090"),
      )!.req;
      expect(order.options!.triggerCardIds).toContain("BT24-085");
      expect(order.options!.triggerDescriptions!.some((description) => description.includes("lose 2 memory"))).toBe(
        true,
      );
      expect(s.state.players[0]!.security.some((card) => card.instanceId === "dev-eot-factorial" && card.faceUp)).toBe(
        memoryFirst,
      );
      const mars = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === "dev-eot-mars");
      expect(mars !== undefined).toBe(memoryFirst);
      expect(mars === undefined ? false : observe(s.engine).hasKeyword(mars, "Blocker")).toBe(memoryFirst);
      expect(s.state.memory).toBe(memoryFirst ? 7 : 3);
      expect(
        s.events.filter(
          (event) => event.kind === "memoryChanged" && event.to - event.from === -2 && event.reason === "gainMemory",
        ),
      ).toHaveLength(1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it.each([false, true])("#5315: the arena preserves Wrath Mode's Once Per Turn budget (spent=%s)", async (spent) => {
    const s = await start(spent ? "arena-github-5315-homeros-spent" : "arena-github-5315-homeros-unused");
    try {
      expect(s.state.memory).toBe(spent ? 4 : 1);
      const base = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.cardId === (spent ? "BT25-044" : "BT26-103"),
      )!;
      expect(
        s.engine.applyIntent(
          0,
          spent
            ? {
                type: "digivolve",
                permanentId: base.permanentId,
                instanceId: "dev-eot-wrath",
              }
            : { type: "endPhase" },
        ),
      ).toEqual({ ok: true });
      await endAtOpponentBreeding(s);
      expect(s.state.players[0]!.security).toHaveLength(3);
      const recovery = s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "BT26-103" && event.timing === "WhenDigivolving",
      );
      expect(recovery).toHaveLength(1);
      const homerosIndex = s.events.findIndex(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "BT24-102" && event.timing === "OnEndTurn",
      );
      const recoveryIndex = s.events.indexOf(recovery[0]!);
      expect(homerosIndex).toBeGreaterThanOrEqual(0);
      expect(recoveryIndex > homerosIndex).toBe(!spent);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
