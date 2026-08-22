import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-052.js";

describe("BT20-052 Oblivimon", () => {
  it("plays from security at the end of the opponent's turn and flips the next face-down opposing security card on DNA digivolving", () => {
    expect(compiled.effects.find((effect) => effect.isSecurity)).toMatchObject({ trigger: "EndOfOpponentsTurn", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" }] });
  });

  it("may place this Digimon's top card face-up at security bottom after a face-up check", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn" && !effect.isInherited)).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenCheckedFaceUpSecurity", actions: [{ kind: "SecurityManipulation", op: "addBottom", controller: "mine", faceUp: true, optional: true, source: { filter: { isSelfRef: true }, isSelf: true } }] }] });
  });

  it("prevents switching this Digimon's attack target as an inherited effect", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" }] });
  });
});
