import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

type ScenarioEngine = ReturnType<typeof setupEngine>;

async function playPuppetAtEndTurn(s: ScenarioEngine) {
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT23-076") && !s.state.pendingDecision,
  );
}

const scenarios: [DevScenarioId, (s: ScenarioEngine) => Promise<void>][] = [
  [
    "arena-issue-5168-alter-s-simultaneous",
    async (s) => {
      const source = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX9-021")!;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: source.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX9-019") && !s.state.pendingDecision,
      );
      expect(s.state.players[0]!.security[0]?.cardId).toBe("EX9-021");
    },
  ],
  [
    "arena-issue-5169-demidevimon-native",
    async (s) => {
      const arukenimon = s.state.players[0]!.hand.find((c) => c.cardId === "EX10-048")!;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: arukenimon.instanceId })).toEqual({ ok: true });
      await settle(
        () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX10-011") && !s.state.pendingDecision,
      );
      const host = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX10-011")!;
      expect(host.stack.some((c) => c.cardId === "P-239")).toBe(true);
      expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(true);
      expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT1-009");
    },
  ],
  ["arena-issue-5170-kaguyamon-end-turn", playPuppetAtEndTurn],
  [
    "arena-issue-5170-kaguyamon-on-play",
    async (s) => {
      const kagu = s.state.players[0]!.hand.find((c) => c.cardId === "EX12-065")!;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: kagu.instanceId })).toEqual({ ok: true });
      await settle(
        () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT23-076") && !s.state.pendingDecision,
      );
    },
  ],
  [
    "arena-issue-5170-arisa-overclock",
    async (s) => {
      await playPuppetAtEndTurn(s);
      expect(s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX11-060")!.isSuspended).toBe(true);
    },
  ],
];

it.each(scenarios)("public-intent arena %s", async (id, exercise) => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: true,
    },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  await exercise(s);
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  const breeding = s.state.phase === Phase.Breeding;
  const breedingExit = breeding ? s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" }) : { ok: true };
  expect(breedingExit).toEqual({ ok: true });
  if (breeding) await advance(s.engine).waitForMainPhase(s.state.turnSeat);
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
