import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard, wouldDigivolveSelfReducersFor } from "../../engine/effects/interpreter.js";
import "./BT7-051.js";

describe("BT7-051 RhinoKabuterimon", () => {
  it("publishes its optional attack evolution and Tamer-source self reducer", () => {
    expect(runtimeCompiledCard("BT7-051")).toMatchObject({ coverage: "full", residual: [] });
    expect(wouldDigivolveSelfReducersFor("BT7-051")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: 2,
          sourceFilter: { controller: "mine", kind: ["Digimon"], digivolutionStackKind: ["Tamer"] },
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT7-051")?.effects[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      payCost: true,
      from: ["hand"],
      costOverride: 3,
    });
  });

  it("reduces its own Tamer-source digivolution cost by 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-046", under: ["BT7-089"], as: "base" }],
        hand: [{ card: "BT7-051", as: "rhinoInHand" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rhinoInHand").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("rhinoInHand").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("digivolves into an Insectoid or Ten Warriors card for 3 memory when attacking with a qualifying source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-051", under: ["BT6-049"], as: "rhino" }],
          hand: [{ card: "BT7-054", as: "ancient" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rhino").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rhino").topCard?.instanceId === s.inst("ancient").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
