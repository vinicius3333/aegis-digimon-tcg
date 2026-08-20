import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-051.js";

describe("BT15-051", () => {
  it("gains memory with a suspended opposing Digimon and draws when Lillymon/X Antibody is stacked", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas" } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "Draw", amount: 1, condition: { kind: "selfDigivolutionStackHasTrait" }, scaling: { per: 1, unit: "cards" } });
  });
  it("gains +1000 DP per suspended opposing Digimon as an inherited effect", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, scaling: { per: 1, unit: "cards" } }] }));
});
