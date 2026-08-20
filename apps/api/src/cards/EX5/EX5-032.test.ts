import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-032.js";

describe("EX5-032 LoaderLeomon", () => {
  it("has Fortitude and reduces opposing Digimon by 3000 on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([{ keyword: "Fortitude" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent" } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -3000 });
  });
  it("inherits Blocker while it has Leomon in its name on the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } }, while: { kind: "selfHasNameContaining", names: ["Leomon"] } });
  });
});
