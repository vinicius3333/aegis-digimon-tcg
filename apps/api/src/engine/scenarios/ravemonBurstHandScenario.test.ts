import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("Discord 1557873736131154071 arena: legitimate burst reveals hand choices and completes trash/security clauses", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-ravemon-burst-hand", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const host = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT13-089")!;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: host.permanentId,
      instanceId: "ravemon-burst-card",
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const request = s.decisions.at(-1)!.req;
  expect(request.options?.visibleCards).toEqual([
    { instanceId: "ravemon-burst-hand-first", cardId: "BT1-009" },
    { instanceId: "ravemon-burst-hand-second", cardId: "BT1-010" },
  ]);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "selectCards", instanceIds: ["ravemon-burst-hand-second"] },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain("ravemon-burst-hand-second");
  expect(s.state.players[1]!.hand.map((c) => c.instanceId)).toEqual([
    "ravemon-burst-hand-first",
    "ravemon-burst-security-1-0",
  ]);
  expect(s.state.players[1]!.security).toHaveLength(1);
  expect(s.state.memory).toBe(3);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
