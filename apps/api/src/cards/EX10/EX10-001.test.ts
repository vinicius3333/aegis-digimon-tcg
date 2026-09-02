import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-001.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";

function primitivesOf(s: { engine: unknown }): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("EX10-001 Flickmon inherited link-trash trigger", () => {
  it("gains 1 memory when an effect trashes this Digimon's link card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            under: [{ card: "EX10-001", as: "flickmon" }],
            linked: [
              { card: "BT1-009", as: "linkCard" },
              { card: "BT1-010", as: "secondLinkCard" },
            ],
          },
        ],
      },
    });
    const host = s.perm("host");
    const link = s.inst("linkCard");
    const memoryBefore = s.state.memory;

    await s.engine.recomputeContinuousEffects();
    await primitivesOf(s).trash([link.instanceId]);
    await settle(() => host.linked.length === 1 && s.state.memory === memoryBefore + 1);

    expect(host.linked).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBefore + 1);

    await primitivesOf(s).trash([s.inst("secondLinkCard").instanceId]);
    await settle(() => false, 30);

    expect(host.linked).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("scopes the watcher to this Digimon's own link cards", () => {
    // FAILS-WHEN-REVERTED: dropping `sourceFilter` makes the watcher fire on every link-card
    // trash on the board, including the opponent's.
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("does not gain memory when another Digimon's link card is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            under: [{ card: "EX10-001", as: "flickmon" }],
            linked: [{ card: "BT1-009", as: "ownLink" }],
          },
          {
            card: "BT1-010",
            as: "neighbor",
            linked: [{ card: "BT1-010", as: "neighborLink" }],
          },
        ],
      },
      1: {
        battleArea: [
          {
            card: "BT1-010",
            as: "enemy",
            linked: [{ card: "BT1-009", as: "enemyLink" }],
          },
        ],
      },
    });
    const memoryBefore = s.state.memory;

    await s.engine.recomputeContinuousEffects();
    await primitivesOf(s).trash([s.inst("neighborLink").instanceId]);
    await settle(() => false, 30);
    expect(s.state.memory).toBe(memoryBefore);

    await primitivesOf(s).trash([s.inst("enemyLink").instanceId]);
    await settle(() => false, 30);
    expect(s.state.memory).toBe(memoryBefore);

    // The host's OWN link card still pays out, proving the gate is scoped, not disabled.
    await primitivesOf(s).trash([s.inst("ownLink").instanceId]);
    await settle(() => s.state.memory === memoryBefore + 1);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("does not gain memory when a non-link card is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host" }],
        hand: [{ card: "BT1-009", as: "handCard" }],
      },
    });
    const memoryBefore = s.state.memory;

    await s.engine.recomputeContinuousEffects();
    await primitivesOf(s).trash([s.inst("handCard").instanceId]);
    await settle(() => false, 30);

    expect(s.state.memory).toBe(memoryBefore);
  });
});
