import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-006.js";

describe("EX11-006 Flickmon", () => {
  it("requires a linked Maquinamon before its inherited attack digivolution", () => {
    const effect = runtimeCompiledCard("EX11-006")!.effects[0]!;
    expect(effect).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      condition: {
        kind: "hostHasLinkedWith",
        filter: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
      },
    });
    expect(effect.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      reduceCost: 2,
      payCost: true,
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
    });
  });
});
