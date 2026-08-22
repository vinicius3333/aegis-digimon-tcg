import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "./P-142.js";

describe("P-142 Falcomon", () => {
  it("encodes the On Play suspension and Ravemon attack option", () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-142", as: "source" }] } });
    const onPlay = getCompiledCard("P-142")?.effects.find((effect) => effect.trigger === "OnPlay");

    expect(onPlay?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } } }) }),
      expect.objectContaining({
        kind: "GrantStatic",
        grant: { canAttackDigimon: true },
        duration: "forTheTurn",
        optional: true,
        abortOnDecline: true,
        cost: expect.objectContaining({ kind: "place", position: "bottom", destination: "digivolutionStack" }),
      }),
    ]));
    assertNoLoudGap(s);
  });

  it("encodes zero-cost Pinamon digivolution and inherited non-battle deletion hand trash", () => {
    const compiled = getCompiledCard("P-142")!;
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Pinamon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [expect.objectContaining({
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [expect.objectContaining({ kind: "Trash", chooser: "opponent", target: { filter: { controller: "opponent", zone: "hand" }, count: 1 } })],
        })],
      }),
    ]));
  });
});
