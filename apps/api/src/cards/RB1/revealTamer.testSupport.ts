import { expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * Plays `rookieId`, whose [On Play] reveals the top 3 cards and adds "1 card with [X] in its
 * text and 1 [Tamer]". The deck holds that Tamer (which also has [X] in its text), a non-Tamer
 * [X]-text card, and a filler. `firstPick` steers the text-slot choice.
 */
export async function revealTamerAndTextCard(
  rookieId: string,
  tamerId: string,
  textCardId: string,
  firstPick: "tamer" | "textCard",
) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        hand: [{ card: rookieId, as: "rookie" }],
        deck: [
          { card: tamerId, as: "tamer" },
          { card: textCardId, as: "textCard" },
          { card: "BT1-009", as: "filler" },
        ],
      },
    },
    { autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.inst(firstPick).instanceId);
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rookie").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length < 3);

  const firstSelection = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
  const firstOptions = JSON.parse(JSON.stringify(firstSelection.options)) as {
    candidateInstanceIds: string[];
    min: number;
  };
  return {
    handIds: s.state.players[0]!.hand.map((card) => card.cardId),
    deckIds: s.state.players[0]!.deck.map((card) => card.cardId),
    textSlotCandidates: firstOptions.candidateInstanceIds,
    textSlotMin: firstOptions.min,
    tamerInstanceId: s.inst("tamer").instanceId,
    textCardInstanceId: s.inst("textCard").instanceId,
  };
}
