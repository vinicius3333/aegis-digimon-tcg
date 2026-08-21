import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-005.js";

describe("EX11-005 Yaamon", () => {
  it("keeps the optional trash digivolution and conditional hand cleanup together", () => {
    const effect = runtimeCompiledCard("EX11-005")!.effects[0]!;
    expect(effect).toMatchObject({ trigger: "StartOfYourMainPhase", isInherited: true });
    expect(effect.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      from: ["trash"],
      reduceCost: 1,
      into: { nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }] },
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "Trash",
      target: { count: 2 },
      condition: { kind: "ifThisEffectDigivolved" },
    });
  });
});
