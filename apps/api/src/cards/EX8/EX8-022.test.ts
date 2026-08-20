import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-022.js";

describe("EX8-022", () => {
  it("has Ice Clad and trashes 2 digivolution cards from an opposing Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "IceClad", raw: "＜Ice Clad＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, target: { count: 1 }, fromTop: false });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "opponentHasNone" } });
  });
  it("inherits Security Attack -1 against an opposing Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" }));
});
