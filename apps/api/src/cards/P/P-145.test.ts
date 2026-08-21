import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-145.js";

describe("P-145 Myotismon (X Antibody)", () => {
  it("deletes an opposing level 4 Digimon on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "P-145", as: "source" }] },
      1: { battleArea: [{ card: "BT1-033", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("encodes zero-cost Myotismon digivolution and conditional level-6 revival", () => {
    const compiled = runtimeCompiledCard("P-145")!;
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Myotismon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "Delete" })] }),
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [expect.objectContaining({
          kind: "PlayWithoutCost",
          from: ["trash"],
          optional: true,
          condition: expect.objectContaining({ kind: "selfDigivolutionStackHasTrait" }),
          target: expect.objectContaining({ filter: expect.objectContaining({ levels: [6] }) }),
        })],
      }),
    ]));
  });
});
