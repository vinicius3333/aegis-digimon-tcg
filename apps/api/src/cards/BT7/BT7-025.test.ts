import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard, wouldDigivolveSelfReducersFor } from "../../engine/effects/interpreter.js";
import "./BT7-025.js";

describe("BT7-025 Beowolfmon", () => {
  it("publishes its hand-resident self-reducer for a Tamer-source digivolution", () => {
    expect(runtimeCompiledCard("BT7-025")).toMatchObject({ coverage: "full", residual: [] });
    expect(wouldDigivolveSelfReducersFor("BT7-025")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: 2,
          sourceFilter: { controller: "mine", kind: ["Digimon"], digivolutionStackKind: ["Tamer"] },
        }),
      ]),
    );
  });

  it("reduces only its own digivolution cost when the base has a Tamer source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-021", as: "base", under: ["BT7-086"] }],
        hand: [{ card: "BT7-025", as: "beowolfInHand" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beowolfInHand").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("beowolfInHand").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("returns a Hybrid source as its attack cost, trashes the target's sources, and returns it to hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-025", under: [{ card: "BT6-049", as: "hybrid" }], as: "beowolf" }] },
        1: {
          battleArea: [{ card: "BT6-049", under: [{ card: "BT1-010", as: "targetSource" }], as: "target" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beowolf").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId) &&
        s.state.players[1]!.hand.some((card) => card.instanceId === targetId),
    );

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("targetSource").instanceId)).toBe(true);
  });

  it("may decline the attack effect without returning a source or moving the target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-025", under: [{ card: "BT6-049", as: "hybrid" }], as: "beowolf" }] },
        1: {
          battleArea: [{ card: "BT6-049", under: [{ card: "BT1-010", as: "targetSource" }], as: "target" }],
          security: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beowolf").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));

    expect(s.perm("beowolf").stack.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(true);
    expect(s.perm("target").stack.some((card) => card.instanceId === s.inst("targetSource").instanceId)).toBe(true);
  });
});
