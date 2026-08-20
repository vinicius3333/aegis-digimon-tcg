import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-012.js";

describe("EX4-012 VictoryGreymon", () => {
  it("raises the DP deletion ceiling by 2000 per opponent Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Delete", dpCeiling: 6000, dpCeilingScaling: { per: 1, amount: 2000, unit: "cards", filter: { zone: "battleArea", controller: "opponent", kind: ["Digimon"] } } });
  });
  it("deletes the highest-DP opposing Digimon after another deletion if a Tamer is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] } }, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: 1 } }] });
  });
});
