import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, drainMicrotasks, type EngineSetup } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

function expectAccepted(result: unknown): void {
  expect(result).toEqual({ ok: true });
}

async function answerOptionals(
  s: EngineSetup,
  accept: (sourceCardId: string | undefined) => boolean,
  preset: "ask" | "yes" | "no" = "ask",
): Promise<void> {
  for (let round = 0; round < 100; round++) {
    await drainMicrotasks(4);
    const pending = s.state.pendingDecision;
    if (pending === undefined) continue;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)?.req;
    if (request?.kind === "orderTriggers") {
      const keys = request.options!.triggerKeys!;
      const optionalAnswers = Object.fromEntries(
        keys.flatMap((key, index) =>
          request.options!.triggerIsOptional?.[index] && preset !== "ask" ? [[key, preset === "yes"]] : [],
        ),
      );
      expectAccepted(
        s.engine.applyIntent(request.seat, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "orderTriggers", order: keys, optionalAnswers },
        }),
      );
      continue;
    }
    if (request?.kind !== "optional") continue;
    expect(
      s.engine.applyIntent(request.seat, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "optional", accept: accept(request.sourceCardId) },
      }),
    ).toEqual({ ok: true });
  }
}

describe("Discord 1557413340161253496 playable Rock deck scenarios", () => {
  for (const name of ["proganomon", "pyramidimon", "magneticdramon"] as const) {
    it(`${name}: real turn loop pays only with battle-area sources`, async () => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["placing 3"] },
      );
      layDevScenario(`arena-rock-${name}-breeding-sources`, s.state, [BLUE_DECK, RED_DECK]);
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: "dev-perm-0-rock-attacker",
          target: { kind: "permanent", permanentId: "dev-perm-1-rock-victim" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
      const breedingIds = s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId);
      const sourceDecisions = s.decisions.filter(({ req }) => req.kind === "selectCards");
      const memory = s.state.memory;
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      expect(breedingIds).toEqual(["EX8-005"]);
      expect(
        sourceDecisions.every(({ req }) => !req.options?.candidateInstanceIds?.includes("dev-stack-0-rock-breeding-0")),
      ).toBe(true);
      expect(memory).toBe(6);
      expect(s.state.players[1]!.security).toHaveLength(name === "pyramidimon" ? 5 : 4);
    });
  }

  for (const acceptDelay of [true, false]) {
    for (const acceptPyramidCost of acceptDelay ? [true, false] : [false]) {
      for (const preset of acceptDelay && acceptPyramidCost ? (["ask", "yes", "no"] as const) : (["ask"] as const)) {
        it(`real Close → Gravel Hearts → Pyramidimon: Delay ${acceptDelay}, trash cost ${acceptPyramidCost}, optional preset ${preset}`, async () => {
          const preferInstanceIds = ["dev-stack-0-rock-fuel-0", "dev-perm-0-rock-attacker", "dev-rock-pyramidimon"];
          const s = setupEngine(
            { 0: {}, 1: {} },
            { autoSelectCards: true, autoOrderTriggers: false, preferInstanceIds },
          );
          layDevScenario("arena-rock-gravel-hearts-tumblemon-memory", s.state, [BLUE_DECK, RED_DECK]);
          const loop = s.engine.startTurnLoop();
          await settle(() => s.state.phase === Phase.Breeding);
          expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
          await advance(s.engine).waitForMainPhase(0);
          await answerOptionals(s, () => false);
          s.state.memory = 6;
          const before = s.events.length;
          const bus = await observe(s.engine).captureSubTriggers(async () => {
            expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-rock-landramon" })).toEqual({
              ok: true,
            });
            let pyramidOffers = 0;
            await answerOptionals(
              s,
              (card) => {
                if (card === "EX10-063")
                  preferInstanceIds.push("dev-rock-tumblemon", "dev-rock-mineral-1", "dev-rock-mineral-2");
                if (card === "EX10-069") return acceptDelay;
                if (card === "EX11-044") return ++pyramidOffers === 1 && acceptPyramidCost;
                return true;
              },
              preset,
            );
            await settle(
              () =>
                s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-rock-close")!
                  .isSuspended &&
                s.state.pendingDecision === undefined &&
                (!acceptDelay || s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-044")),
            );
          });
          const evolved = s.state.players[0]!.battleArea.find(
            ({ permanentId }) => permanentId === "dev-perm-0-rock-attacker",
          )!;
          expect(evolved.topCard.cardId).toBe(acceptDelay ? "EX11-044" : "EX10-032");
          expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX10-069")).toBe(acceptDelay);
          expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === "dev-rock-tumblemon")).toBe(
            acceptDelay && acceptPyramidCost && preset !== "yes",
          );
          const memory = s.state.memory;
          const gains = s.events
            .slice(before)
            .filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory");
          const breedingIds = s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId);
          expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
          await loop;
          expect(bus.some(({ event }) => event === "whenSuspended")).toBe(true);
          expect(
            bus.some(
              ({ event, payload }) =>
                event === "onDigivolutionCardsDiscardedBatch" &&
                payload.subjectPermanentId === "dev-perm-0-rock-attacker" &&
                payload.trashedDigivolutionInstanceIds?.includes("dev-rock-tumblemon"),
            ),
          ).toBe(acceptDelay && acceptPyramidCost);
          expect(breedingIds).toEqual(["EX8-005"]);
          expect(memory).toBe(acceptDelay && acceptPyramidCost ? 4 : 3);
          expect(gains).toHaveLength(acceptDelay && acceptPyramidCost ? 2 : 1);
          expect(gains).toEqual([
            { kind: "memoryChanged", from: 2, to: 3, reason: "gainMemory" },
            ...(acceptDelay && acceptPyramidCost
              ? [{ kind: "memoryChanged", from: 3, to: 4, reason: "gainMemory" }]
              : []),
          ]);
          expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "EX8-005")).toBe(false);
        });
      }
    }
  }
});
