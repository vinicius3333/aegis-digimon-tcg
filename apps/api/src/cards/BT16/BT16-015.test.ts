import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-015.js";

describe("BT16-015", () => {
  it("grants Blitz and a conditional end-of-attack deletion effect when Phoenixmon/X Antibody is stacked", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blitz" }, duration: "forTheTurn" });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "GrantStatic", condition: { kind: "selfDigivolutionStackHasTrait" } });
  });
  it("on deletion may play a qualifying red Digimon and delete an opposing Digimon within its DP", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, bindResultAs: "playedDigimon" }, { kind: "Delete", target: { filter: { dp: { valueFrom: "playedDigimon" } } } }] }));
});
