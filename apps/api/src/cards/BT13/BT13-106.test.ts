import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-106.js";

describe("BT13-106 Odin's Breath", () => {
  it("activates Main when directly trashed from security by an effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDiscardSecurity")?.actions?.[0]).toMatchObject({ kind: "ActivateMain" });
  });

  it("reduces one opposing Digimon and conditionally grants Security Attack -1 to all opposing Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
    expect(actions[1]).toMatchObject({ kind: "GainKeyword", duration: "untilOpponentTurnEnd", keyword: { keyword: "SecurityAttack", amount: -1 }, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" }, condition: { kind: "totalSecurityCount", op: "lte", value: 6 } });
  });
});
