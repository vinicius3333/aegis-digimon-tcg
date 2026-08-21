import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-085.js";

describe("BT17-085 Rika Nonaka", () => {
  it("gains memory when the opponent has a Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }] });
  });

  it("requires a Renamon and all three named Trash cards for the Sakuyamon digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { nameOrTrait: [{ tokens: ["Renamon"], match: "name" }] } },
      into: { nameOrTrait: [{ tokens: ["Sakuyamon"], match: "name" }] },
      from: ["hand"],
      costOverride: 4,
      ignoreRequirements: true,
      optional: true,
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom" },
      additionalCosts: [
        { kind: "place", target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["Kyubimon"], match: "name" }] } } },
        { kind: "place", target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["Taomon"], match: "name" }] } } },
      ],
    });
  });

  it("returns an Option only after this effect digivolves, and plays itself from Security", () => {
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({ kind: "Return", to: "hand", optional: true, condition: { kind: "ifThisEffectDigivolved" }, target: { filter: { zone: "trash", kind: ["Option"] } } });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });
});
