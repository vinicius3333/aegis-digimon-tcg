import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-026.js";

describe("EX6-026 Shakamon", () => {
  it("grants Security Attack -1, DigiXros DP/Blocker, and inherits Security Attack -1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }, { kind: "ModifyDP", amount: 3000, condition: { kind: "digiXrosCount" } }, { kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "digiXrosCount" } }]);
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } });
  });
  it("returns a yellow evolution card to hand when it would leave play", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "Return", to: "hand", target: { filter: { zone: "digivolutionCards", colors: ["Yellow"], hostFilter: { isSelfRef: true } } } }] }));
});
