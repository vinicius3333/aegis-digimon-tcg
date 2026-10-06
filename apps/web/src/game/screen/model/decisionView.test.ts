// @vitest-environment jsdom
import { expect, it } from "vitest";
import type { DecisionRequest } from "@aegis/shared";
import { createArenaDemoState } from "../../../dev/ArenaDemo";
import { decisionViewFor } from "./decisionView";

it("keeps field-card choices on the board even when a preceding prompt requested a dialog", () => {
  const state = createArenaDemoState();
  const permanents = [...state.players].flatMap((player) => [...player.battleArea]);
  const target = permanents[0]!;
  const request: DecisionRequest = {
    decisionId: "field-target",
    seat: 0,
    kind: "chooseTargets",
    promptText: "Select a Digimon to suspend.",
    options: { candidateInstanceIds: [target.permanentId], min: 0, max: 1 },
  };
  const inputs = {
    decision: request,
    decisionAnimationsPending: false,
    decisionAsDialog: true,
    viewerSeat: 0 as const,
    events: [],
    state,
    instanceIndex: new Map<string, string>(),
    permanents,
    breedingPermanents: [],
    handInstanceIds: [...state.players[0]!.hand].map((card) => card.instanceId),
  };
  expect(decisionViewFor(inputs).answerOnBoard).toBe(true);
  expect(decisionViewFor({ ...inputs, decisionAnimationsPending: true }).viewerDecision).toBeUndefined();
  expect(
    decisionViewFor({
      ...inputs,
      decision: { ...request, options: { candidateInstanceIds: [inputs.handInstanceIds[0]!], min: 0, max: 1 } },
    }).answerOnBoard,
  ).toBe(false);
});
