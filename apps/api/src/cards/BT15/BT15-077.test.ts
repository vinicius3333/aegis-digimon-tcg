import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-077.js";

describe("BT15-077", () => {
  it("deletes its battle opponent when deleted after losing a battle", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { filter: { sourceRef: "battleOpponent" } } }],
    }));
  it("reveals four to add up to two level 6 or higher cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2, upTo: true }] }],
    }));
  it("may delete a Digimon to play a Dark Masters into breeding and unsuspends as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], breeding: true, cost: { kind: "deleteOwn" }, optional: true },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
  });
});
