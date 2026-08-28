import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-085.js";
import "./index.js";

describe("BT17-085 Rika Nonaka", () => {
  it("gains memory when the opponent has a Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
    expect(compiled.effects?.[0]?.actions?.[0]?.condition?.filter).not.toHaveProperty("nameOrTrait");
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
        {
          kind: "place",
          target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["Kyubimon"], match: "name" }] } },
        },
        {
          kind: "place",
          target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["Taomon"], match: "name" }] } },
        },
      ],
    });
  });

  it("returns an Option only after this effect digivolves, and plays itself from Security", () => {
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      condition: { kind: "ifThisEffectDigivolved" },
      target: { filter: { zone: "trash", kind: ["Option"] } },
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("gains memory when the opponent has a non-Renamon Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-085", as: "rika" }] },
      1: { battleArea: [{ card: "BT17-063", as: "darcmon" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("rika"));

    expect(s.state.memory).toBe(1);
  });
});
