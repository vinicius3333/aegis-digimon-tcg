import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-065.js";
import "../index.js";

describe("BT21-065 Ghostmon", () => {
  it("preserves complete residual-free coverage", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("reduces Ghost digivolution cost on your turn and gains memory on deletion", () => {
    expect(compiled.effects).toContainEqual({
      trigger: "YourTurn",
      actions: [
        expect.objectContaining({
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          actions: [expect.objectContaining({ kind: "Replacement", mode: "reduceCost", amount: 1 })],
        }),
      ],
    });
    expect(compiled.effects).toContainEqual({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
      isInherited: true,
    });
  });

  it("reduces a Ghost evolution by exactly 1 through the public intent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-065", as: "ghostmon" }],
        hand: [{ card: "BT20-068", as: "bakemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard.instanceId === s.inst("bakemon").instanceId);

    expect(s.state.memory).toBe(2);
  });

  it("does not reduce an evolution into a non-Ghost card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-065", as: "ghostmon" }],
        hand: [{ card: "BT10-074", as: "quetzalmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("quetzalmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard.instanceId === s.inst("quetzalmon").instanceId);

    expect(s.state.memory).toBe(1);
  });

  it("does not reduce a Ghost evolution from the breeding area (Q4573)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-065", as: "ghostmon" },
        hand: [{ card: "BT20-068", as: "bakemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard.instanceId === s.inst("bakemon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("gains 1 memory when a realistic host carrying Ghostmon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-068", as: "bakemon", under: [{ card: "BT21-065", as: "source" }] }] },
    });
    await s.ready();
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("bakemon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("gains 1 memory when a public battle deletes a legal Ghost host stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-068", as: "host", suspended: true, under: [{ card: "BT21-065", as: "source" }], dp: 4000 },
          ],
        },
        1: { battleArea: [{ card: "BT2-075", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.memory === 4);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });
});
