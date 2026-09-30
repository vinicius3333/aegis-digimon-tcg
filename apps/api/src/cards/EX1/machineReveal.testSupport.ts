import { expect } from "vitest";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";

async function digivolveFromGuardromon(cardId: string, answerOptional: "accept" | "decline"): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX1-047", as: "base" }],
        hand: [{ card: cardId, as: "evolution" }],
        deck: [
          { card: "BT1-011", as: "drawn" },
          { card: "BT11-072", as: "machine" },
          { card: "BT1-009", as: "firstMiss" },
          { card: "BT1-010", as: "secondMiss" },
        ],
      },
    },
    answerOptional === "accept" ? { autoAcceptOptional: true } : { autoDeclineOptional: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolution").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === cardId);
  return s;
}

/**
 * "You may reveal ..." lets the player skip the whole effect, but once the cards are revealed
 * the level 6 [Machine] card must be added and the rest trashed.
 */
export async function expectOptionalRevealThenMandatoryAdd(cardId: string): Promise<string[]> {
  const declined = await digivolveFromGuardromon(cardId, "decline");
  await settle(() => declined.state.pendingDecision === undefined);
  expect(declined.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === cardId)).toBe(true);
  expect(declined.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
    declined.inst("machine").instanceId,
    declined.inst("firstMiss").instanceId,
    declined.inst("secondMiss").instanceId,
  ]);
  expect(declined.state.players[0]!.trash).toHaveLength(0);

  const accepted = await digivolveFromGuardromon(cardId, "accept");
  await settle(() => accepted.state.pendingDecision?.kind === "selectCards");
  const selection = accepted.decisions.at(-1)!.req;
  expect(selection.kind).toBe("selectCards");
  expect(selection.options?.candidateInstanceIds).toEqual([accepted.inst("machine").instanceId]);
  expect(selection.options?.min).toBe(1);
  expect(
    accepted.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: selection.decisionId,
      response: { kind: "selectCards", instanceIds: [accepted.inst("machine").instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => accepted.state.pendingDecision === undefined && accepted.state.players[0]!.deck.length === 0);

  expect(accepted.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
    accepted.inst("drawn").instanceId,
    accepted.inst("machine").instanceId,
  ]);
  expect(accepted.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
    [accepted.inst("firstMiss").instanceId, accepted.inst("secondMiss").instanceId].sort(),
  );
  return accepted.state.players[0]!.hand.map((card) => card.cardId);
}
