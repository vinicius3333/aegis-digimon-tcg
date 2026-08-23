import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-063.js";

describe("EX2-063 Kazu Shioda", () => {
  it("may suspend when a Machine becomes suspended to draw 1 then trash 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-031", as: "machine" },
            { card: "EX2-063", as: "kazu" },
          ],
          hand: ["BT1-001"],
          deck: ["BT1-002"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kazu").isSuspended && s.state.players[0]!.trash.length === 1);
    expect(s.perm("kazu").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
