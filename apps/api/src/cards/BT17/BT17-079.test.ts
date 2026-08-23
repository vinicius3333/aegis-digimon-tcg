import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-079.js";

describe("BT17-079 Takuya Kanbara", () => {
  it("plays itself from Security and gains memory when the opponent has a Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
  });

  it("gives the inherited host +2000 DP during its turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });

  it("grants Piercing only while the inherited host has at least 10000 DP", () => {
    expect(compiled.effects?.[2]?.actions?.[1]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
      while: { kind: "selfDpAtLeast", value: 10000 },
    });
  });
});
