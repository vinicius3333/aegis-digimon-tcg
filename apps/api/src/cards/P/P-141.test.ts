import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "./P-141.js";

describe("P-141 MameTyramon", () => {
  it("encodes Collision, Blocker, and the Rule name treatment", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-141", as: "source" }] } });

    const effects = getCompiledCard("P-141")?.effects ?? [];
    expect(effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Collision", raw: "＜Collision＞" }] }),
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
      expect.objectContaining({ trigger: "Rule", actions: [expect.objectContaining({ kind: "GrantStatic", grant: "name", tokens: ["Mamemon", "Tyrannomon"] })] }),
    ]));
    assertNoLoudGap(s);
  });

  it("encodes the once-per-turn unsuspend triggers for both top and inherited effects", () => {
    const effects = getCompiledCard("P-141")?.effects ?? [];
    expect(effects.filter((effect) => effect.trigger === "AllTurns")).toHaveLength(2);
    expect(effects.filter((effect) => effect.trigger === "AllTurns")).toEqual(expect.arrayContaining([
      expect.objectContaining({ frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" })] }),
      expect.objectContaining({ isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" })] }),
    ]));
    expect(getCompiledCard("P-141")?.digivolutionRequirement).toEqual([{ level: 4, names: ["Mamemon", "Tyrannomon"], cost: 3, isAlternate: true }]);
  });
});
