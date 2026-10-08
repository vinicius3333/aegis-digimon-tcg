import { CardInstance, GameState, Permanent, PlayerState, type DecisionRequest, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { decisionViewFor } from "./decisionView";
import { decisionAllowsPick } from "./decisionPicks";
import { attackTargetPrompt } from "./attackTargetPrompt";

describe("#5342 Neptunemon effect Battle selection", () => {
  for (const seat of [0, 1] as const) {
    it.each([false, true])(`seat ${seat}: server-offered Neptunemon is selectable while suspended %s`, (suspended) => {
      const state = new GameState();
      state.players.push(new PlayerState(), new PlayerState());
      const opponent: Seat = seat === 0 ? 1 : 0;
      function place(controller: Seat, cardId: string, id: string) {
        const permanent = new Permanent();
        permanent.permanentId = id;
        permanent.controllerSeat = controller;
        permanent.topCard = new CardInstance();
        permanent.topCard.cardId = cardId;
        permanent.topCard.instanceId = `${id}-top`;
        state.players[controller]!.battleArea.push(permanent);
        return permanent;
      }
      const merciful = place(seat, "EX13-077", "merciful");
      const neptunemon = place(opponent, "BT24-030", "neptunemon");
      neptunemon.isSuspended = suspended;
      const decision: DecisionRequest = {
        decisionId: "battle-target",
        seat,
        kind: "chooseTargets",
        sourceCardId: "EX13-077",
        sourcePermanentId: merciful.permanentId,
        sourceInstanceId: merciful.topCard.instanceId,
        promptText: "Choose a Digimon",
        options: { candidateInstanceIds: [neptunemon.permanentId], min: 1, max: 1 },
      };
      const input = {
        decision,
        decisionAnimationsPending: false,
        decisionAsDialog: false,
        viewerSeat: seat,
        events: [],
        state,
        instanceIndex: new Map<string, string>(),
        permanents: [merciful, neptunemon],
        breedingPermanents: [],
        handInstanceIds: [],
      };
      const view = decisionViewFor(input);
      expect(view.answerOnBoard).toBe(true);
      expect(decisionAllowsPick({ ...view, instanceId: neptunemon.permanentId, picks: [] })).toBe(true);
      expect(decisionAllowsPick({ ...view, instanceId: merciful.permanentId, picks: [] })).toBe(false);
      expect(decisionViewFor({ ...input, viewerSeat: opponent }).viewerDecision).toBeUndefined();
      expect(attackTargetPrompt(decision, input.permanents)).toBeUndefined();
    });
  }
});
