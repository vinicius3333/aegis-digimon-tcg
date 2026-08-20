import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-043.js";

describe("EX9-043", () => {
  it("reduces play cost by trashing a Cyborg or Ver.5 card from hand", () => expect(compiled.effects?.find((entry) => entry.trigger === "BeforePayCost")).toMatchObject({ actions: [{ kind: "ReducePlayCost", amount: { kind: "fixed", value: 2 }, payment: { kind: "trashFromHand" } }] }));
  it("places a trash Digimon underneath, de-digivolves, and deletes an opposing Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "PlaceUnder", faceDown: true, position: "bottom" }, { kind: "DeDigivolve", amount: { kind: "countFaceDownDigivolutionCards" } }, { kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } }] }));
  it("has inherited Piercing", () => expect(compiled.effects?.find((entry) => entry.actions.some((action) => action.kind === "GainKeyword"))).toMatchObject({ actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }] }));
});
