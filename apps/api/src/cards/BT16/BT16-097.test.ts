import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-097.js";

describe("BT16-097", () => {
  it("plays Ankylomon or Angemon then DNA digivolves", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "DnaDigivolve", payCost: true, optional: true });
  });

  it("adds the top card of the deck to security if DNA digivolution succeeds", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1, condition: { kind: "ifThisEffectDigivolved" } });
  });

  it("plays Armadillomon or Patamon from security and returns itself to hand", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }, { kind: "AddToHandSelf" }] });
  });
});
