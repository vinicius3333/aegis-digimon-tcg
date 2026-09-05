import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("battle deletion reaction snapshots", () => {
  it("activates a deletion watcher captured before its host leaves play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-039", as: "bomber" }],
          battleArea: [{ card: "BT1-024", as: "attacker" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 5000, as: "target", suspended: true }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bomber").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).subscriptions("onDeletionOf", s.perm("target").permanentId).length === 1);

    const targetId = s.perm("target").permanentId;
    expect(s.perm("target").currentDP).toBe(2000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    // Bombermon costs 7 (10 -> 3); the deleted target's captured watcher makes its controller
    // lose 1 memory, moving the shared gauge toward the attacking player (3 -> 4).
    expect(s.state.memory).toBe(4);
  });

  it("fires a deleted Petrification Token's On Deletion once from its transient snapshot", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-024", as: "attacker" }],
      },
      1: {
        battleArea: [{ card: "TOKEN-Petrification-Token", as: "token", suspended: true }],
        security: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    const tokenId = s.perm("token").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: tokenId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tokenId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "TOKEN-Petrification-Token")).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-Petrification-Token"),
    ).toBe(false);
  });
});
