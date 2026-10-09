import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";

function checkRie(s: EngineSetup, expectedTop: string, expectedStack: string[]): void {
  const host = s.state.players[1]!.battleArea.find((p) => p.permanentId === "dev-perm-1-github-removal-rie")!;
  expect(host.topCard.cardId).toBe(expectedTop);
  expect([...host.stack].map((c) => c.cardId)).toEqual(expectedStack);
}

function checkOverflow(s: EngineSetup, discounted = true): void {
  const opponent = s.state.players[1]!;
  expect(opponent.deck.at(-1)?.cardId).toBe("BT20-060");
  expect(opponent.battleArea.map((p) => p.topCard.cardId)).toEqual(discounted ? ["BT1-020"] : []);
  expect(s.state.memory).toBe(discounted ? 5 : 0);
  expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "overflow")).toHaveLength(1);
}

function checkProtection(s: EngineSetup, mamemonCount = 0, sourceCount = 0): void {
  const opponent = s.state.players[1]!;
  expect(opponent.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT24-019", "BT24-024", "BT24-028", "BT24-030"]);
  // Neptunemon may immediately unsuspend with its own once-per-turn trigger.
  expect(s.decisions.some(({ req }) => req.sourceCardId === "BT24-030")).toBe(true);
  expect([...opponent.trash].filter((c) => ["BT24-019", "BT24-024", "BT24-028"].includes(c.cardId))).toHaveLength(0);
  expect(
    s.events.filter(
      (e) =>
        e.kind === "cardsMoved" &&
        e.from === "unsuspended" &&
        e.to === "suspended" &&
        e.instanceIds.includes("dev-perm-1-github-removal-target-3"),
    ),
  ).toHaveLength(1);
  expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT6-063")).toHaveLength(mamemonCount);
  expect(s.state.players[0]!.security).toHaveLength(3);
  expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(sourceCount);
}

const scenarios = [
  ["arena-github-5277-overflow-full-cost", "BT24-030", (s) => checkOverflow(s, false), 0],
  ["arena-github-5270-senbon", "BT8-106", (s) => checkProtection(s, 2), 0],
  ["arena-github-5282-iron-slash", "BT25-100", (s) => checkRie(s, "BT1-009", []), 0],
  ["arena-github-5282-minervamon", "BT24-041", (s) => checkRie(s, "EX13-074", ["BT1-009"]), 0],
  ["arena-github-5277-overflow", "BT24-030", checkOverflow, 5],
  ["arena-github-5276-overflow", "BT24-030", checkOverflow, 5],
  ["arena-github-5270-junomon", "BT26-083", checkProtection, 4],
  ["arena-github-5270-hurricane", "EX7-071", (s) => checkProtection(s, 0, 1), 4],
  ["arena-github-5270-gundramon", "LM-067", checkProtection, 10],
] as const satisfies readonly (readonly [DevScenarioId, string, (s: EngineSetup) => void, number])[];

describe("GitHub removal arena scenarios", () => {
  for (const [scenario, card, check, finalMemory] of scenarios) {
    it(`${scenario}: public action resolves the reported interaction`, async () => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
        },
      );
      layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
      expect(s.state.memory).toBeGreaterThanOrEqual(-10);
      expect(s.state.memory).toBeLessThanOrEqual(10);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const intent =
          scenario === "arena-github-5270-gundramon"
            ? {
                type: "attack" as const,
                attackerPermanentId: "dev-perm-0-github-removal-attacker",
                target: { kind: "player" as const },
              }
            : { type: "playCard" as const, instanceId: `github-removal-hand-${card}` };
        expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
        await settle(
          () =>
            s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === card) &&
            s.state.pendingDecision === undefined &&
            s.engine.mainVerbContinuationsInFlight === 0 &&
            (scenario !== "arena-github-5270-junomon" || (s.state.turnSeat === 1 && s.state.phase === Phase.Breeding)),
        );
        check(s);
        expect(s.state.memory).toBe(finalMemory);
      } finally {
        expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
        await loop;
      }
    });
  }
});
