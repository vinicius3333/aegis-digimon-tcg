import { describe, it, expect } from "vitest";
import { CardColor, CardInstance, Permanent, type Seat } from "@aegis/shared";
import { createCardSource, type CardStateLookup } from "./CardSource.js";

function makeInstance(cardId: string, ownerSeat: Seat): CardInstance {
  const inst = new CardInstance();
  inst.instanceId = `${cardId}#1`;
  inst.cardId = cardId;
  inst.ownerSeat = ownerSeat;
  inst.faceUp = true;
  return inst;
}

describe("createCardSource", () => {
  it("resolves the static half from the card-data table", () => {
    const inst = makeInstance("BT7-089", 0);
    const lookup: CardStateLookup = {
      permanentOf: () => undefined,
      isOnBattleArea: () => false,
      isSeatsTurn: () => false,
    };
    const source = createCardSource(inst, lookup);

    expect(source.instanceId).toBe("BT7-089#1");
    expect(source.cardId).toBe("BT7-089");
    expect(source.ownerSeat).toBe(0);
    expect(source.definition.nameEn).toBe("J.P. Shibayama");
    expect(source.hasColor(CardColor.Green)).toBe(true);
    expect(source.hasColor(CardColor.Blue)).toBe(false);
  });

  it("delegates the live-state half to the injected lookup", () => {
    const inst = makeInstance("BT7-089", 1);
    const perm = new Permanent();
    perm.permanentId = "p1";

    const calls: string[] = [];
    const lookup: CardStateLookup = {
      permanentOf: (id) => {
        calls.push(`permanentOf:${id}`);
        return perm;
      },
      isOnBattleArea: (id) => {
        calls.push(`isOnBattleArea:${id}`);
        return true;
      },
      isSeatsTurn: (seat) => {
        calls.push(`isSeatsTurn:${seat}`);
        return seat === 1;
      },
    };
    const source = createCardSource(inst, lookup);

    expect(source.permanent()).toBe(perm);
    expect(source.isOnBattleArea()).toBe(true);
    expect(source.isOwnersTurn()).toBe(true); // owner is seat 1
    expect(calls).toEqual([
      "permanentOf:BT7-089#1",
      "isOnBattleArea:BT7-089#1",
      "isSeatsTurn:1",
    ]);
  });

  it("throws when the instance references an unknown card", () => {
    const inst = makeInstance("does-not-exist", 0);
    const lookup: CardStateLookup = {
      permanentOf: () => undefined,
      isOnBattleArea: () => false,
      isSeatsTurn: () => false,
    };
    expect(() => createCardSource(inst, lookup)).toThrow(/Unknown cardId/);
  });
});
