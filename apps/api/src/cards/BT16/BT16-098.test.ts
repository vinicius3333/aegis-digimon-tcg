import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-098.js";

describe("BT16-098", () => {
  it("deletes an opposing cost 4 or lower Digimon or Tamer if Dorugoramon is present", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "Delete", condition: { kind: "youHave" }, target: { filter: { kind: ["Digimon", "Tamer"], playCostLte: 4 } } });
  });

  it("then deletes all opposing Digimon with the lowest play cost", () => {
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "Delete", target: { filter: { kind: ["Digimon"], superlative: "lowestPlayCost" }, count: "all" } });
  });

  it("activates its Main effect from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });
});
