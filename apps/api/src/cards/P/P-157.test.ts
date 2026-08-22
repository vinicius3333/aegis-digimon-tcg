import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-157.js";

describe("P-157 Monimon", () => {
  it("encodes inherited On Deletion Draw 1 conditional on a black Tamer", () => {
    const inherited = runtimeCompiledCard("P-157")!.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Black"] } } }],
    });
  });
});
