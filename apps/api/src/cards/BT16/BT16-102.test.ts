import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-102.js";

describe("BT16-102", () => {
  it("models Blocker and Armor Purge", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }] });
  });

  it("gains DP, immunity, and unsuspends when the Armor Form condition is met", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", condition: { kind: "selfDigivolutionStackHasTrait" } });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({ kind: "GrantImmunity", immuneFrom: "opponentEffects", duration: "untilOpponentTurnEnd", condition: { kind: "selfDigivolutionStackHasTrait" } });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({ kind: "Unsuspend" });
  });

  it("activates its When Digivolving effect after security removal and gains Free", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "ActivateEffect", effectType: "WhenDigivolving", optional: true }] }, { kind: "GrantStatic", grant: "trait", tokens: ["Free"] }] });
  });
});
