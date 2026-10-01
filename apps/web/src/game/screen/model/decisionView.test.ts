import { describe, expect, it } from "vitest";
import { CardInstance, GameState, Permanent, PlayerState, type DecisionRequest } from "@aegis/shared";
import { decisionViewFor } from "./decisionView";

function kingDrasilInBreeding(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "drasil";
  permanent.controllerSeat = 0;
  permanent.inBreeding = true;
  const top = new CardInstance();
  top.instanceId = "drasil-top";
  top.cardId = "BT13-007";
  permanent.topCard = top;
  return permanent;
}

const costReduction: DecisionRequest = {
  decisionId: "d1",
  seat: 0,
  kind: "optional",
  promptText: "reduce the play cost by 4",
  sourceCardId: "BT13-007",
  sourceInstanceId: "drasil-top",
  sourcePermanentId: "drasil",
};

function viewFor(breedingPermanents: readonly Permanent[]) {
  const state = new GameState();
  state.players.push(new PlayerState(), new PlayerState());
  return decisionViewFor({
    decision: costReduction,
    decisionAnimationsPending: false,
    decisionAsDialog: false,
    viewerSeat: 0,
    events: [],
    state,
    instanceIndex: new Map(),
    permanents: [],
    breedingPermanents,
    handInstanceIds: [],
  });
}

describe("decisionViewFor", () => {
  it("answers an optional effect from a breeding-area source on the board rail", () => {
    expect(viewFor([kingDrasilInBreeding()]).answerOnBoard).toBe(true);
  });

  it("keeps the dialog when the optional source is on no permanent", () => {
    expect(viewFor([]).answerOnBoard).toBe(false);
  });
});
