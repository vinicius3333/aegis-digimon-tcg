import { describe, expect, it } from "vitest";
import { CardInstance } from "@aegis/shared";
import { hasFaceUpSecurity, securityAttackLabelKey } from "./securityChrome";

function securityCard(faceUp: boolean, cardId = "ST1-03"): CardInstance {
  const card = new CardInstance();
  card.instanceId = `sec-${faceUp}`;
  card.cardId = cardId;
  card.ownerSeat = 0;
  card.faceUp = faceUp;
  return card;
}

describe("securityAttackLabelKey", () => {
  it("names a stack with cards left a security attack", () => {
    expect(securityAttackLabelKey(3)).toBe("game.securityAttack");
  });

  it("names an empty stack a direct attack", () => {
    expect(securityAttackLabelKey(0)).toBe("game.directAttack");
  });
});

describe("hasFaceUpSecurity", () => {
  it("is false for a stack the viewer cannot read", () => {
    expect(hasFaceUpSecurity(undefined)).toBe(false);
    expect(hasFaceUpSecurity([])).toBe(false);
  });

  it("is false while every card is face-down", () => {
    expect(hasFaceUpSecurity([securityCard(false), securityCard(false)])).toBe(false);
  });

  it("is true once a card has been turned face-up", () => {
    expect(hasFaceUpSecurity([securityCard(false), securityCard(true)])).toBe(true);
  });

  it("ignores a face-up marker with no identity behind it", () => {
    expect(hasFaceUpSecurity([securityCard(true, "")])).toBe(false);
  });
});
