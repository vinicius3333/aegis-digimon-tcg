import { describe, expect, it } from "vitest";
import { CardInstance, Permanent, type Seat } from "@aegis/shared";
import { stackCardsOf } from "./stackCardsOf";

function instance(cardId: string, ownerSeat: Seat, faceUp = true): CardInstance {
  const card = new CardInstance();
  card.instanceId = cardId;
  card.cardId = cardId;
  card.ownerSeat = ownerSeat;
  card.faceUp = faceUp;
  return card;
}

function tamerWithFaceDownSource(): Permanent {
  const perm = new Permanent();
  perm.permanentId = "tamer";
  perm.controllerSeat = 0;
  perm.topCard = instance("EX13-063", 0);
  perm.stack.push(instance("EX13-026", 0, false), instance("EX13-019", 0));
  return perm;
}

describe("stackCardsOf", () => {
  it("Discord 1555516815226970172: names the owner's face-down card and keeps it marked face down", () => {
    expect(stackCardsOf({ perm: tamerWithFaceDownSource(), viewerSeat: 0 })).toEqual([
      { cardId: "EX13-063", artId: "", role: "top" },
      { cardId: "EX13-026", artId: "", faceDown: true, role: "stack" },
      { cardId: "EX13-019", artId: "", faceDown: false, role: "stack" },
    ]);
  });

  it("Discord 1555516815226970172: hides a face-down card the opponent decoded before it turned face down", () => {
    expect(stackCardsOf({ perm: tamerWithFaceDownSource(), viewerSeat: 1 })[1]).toEqual({
      cardId: "",
      faceDown: true,
      role: "stack",
    });
  });
});
