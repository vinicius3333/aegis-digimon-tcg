import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-079.js";

describe("BT15-079", () => {
  it("deletes its battle opponent when deleted after losing a battle", () =>
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { filter: { sourceRef: "battleOpponent" } } }],
    }));
  it("deletes an unsuspended opposing Digimon on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { unsuspended: true } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Delete" }] });
  });
  it("restricts this Digimon to white digivolution targets during its owner's turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "RestrictDigivolveInto",
          target: { filter: { isSelfRef: true }, isSelf: true },
          into: { colors: ["White"] },
        },
      ],
    });
  });
  it("deletes itself at opponent end to play a non-Piedmon Dark Masters and unsuspends as inherited", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
  });
});
