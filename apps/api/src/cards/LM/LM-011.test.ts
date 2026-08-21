import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-011.js";

describe("LM-011", () => {
  it("suspends an opponent Digimon and grants Blocker only when none remain unsuspended", () => {
    const effect = runtimeCompiledCard("LM-011")!.effects.find((entry) => entry.trigger === "OnPlay")!;
    expect(effect.actions).toContainEqual(expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ count: 1, filter: expect.objectContaining({ controller: "opponent" }) }) }));
    expect(effect.actions).toContainEqual(expect.objectContaining({ kind: "GainKeyword", keyword: expect.objectContaining({ keyword: "Blocker" }), condition: expect.objectContaining({ kind: "opponentHasNone" }) }));
  });
});
