import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Rina / Evade next-turn arena", () => {
  it.each(["accept", "decline-draw", "decline-evolution"] as const)(
    "Discord 1555995840093360188: %s preserves unsuspend ordering, optional choices, and memory",
    async (choice) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoAcceptOptional: choice !== "decline-draw",
          autoDeclineOptional: choice === "decline-draw",
          autoSelectCards: true,
          preferTriggerKeys: ["EX13-069"],
          declinePrompts: choice === "decline-evolution" ? ["Digivolve"] : [],
        },
      );
      layDevScenario("arena-rina-evade-unsuspend", s.state, [BLUE_DECK, RED_DECK]);
      const human = s.state.players[0]!;
      const veemon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT11-023")!;
      const rina = human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-069")!;
      expect(veemon.isSuspended).toBe(true);
      expect(rina.isSuspended).toBe(true);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined);
        const unsuspend = s.events.findIndex(
          (event) =>
            event.kind === "cardsMoved" && event.to === "unsuspended" && event.instanceIds.includes(veemon.permanentId),
        );
        const trigger = s.events.findIndex(
          (event) => event.kind === "effectTriggered" && ["BT11-112", "EX13-069"].includes(event.sourceCardId),
        );
        expect(unsuspend).toBeGreaterThan(-1);
        expect(trigger).toBeGreaterThan(unsuspend);
        expect(
          s.events.filter(
            (event) =>
              event.kind === "cardsMoved" && event.to === "unsuspended" && event.instanceIds.includes(rina.permanentId),
          ),
        ).toHaveLength(1);
        expect(veemon.topCard.cardId).toBe(choice === "accept" ? "EX13-019" : "BT11-023");
        expect(veemon.isSuspended).toBe(false);
        expect(rina.isSuspended).toBe(choice !== "decline-draw");
        expect(s.state.memory).toBe(6);
        expect(human.hand).toHaveLength(choice === "accept" ? 3 : choice === "decline-draw" ? 2 : 3);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(7);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(0, { type: "endPhase" });
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
