import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-097.js";

describe("BT15-097", () => {
  it("may trash a Machine/Cyborg/SoC Digimon to delete the lowest-play-cost opposing Digimon or Tamer", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "Delete", target: { filter: { superlative: "lowestPlayCost" } }, cost: { kind: "trash" }, optional: true }] }));
  it("activates main in security", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }));
});
