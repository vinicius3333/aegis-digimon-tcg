import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-001.js";

describe("EX2-001 Gigimon", () => {
  it("draws once when its Guilmon-family host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-011", as: "host", under: ["EX2-001"] }],
          deck: [
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "notDrawn" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("does not draw when its host name is outside the Guilmon family", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-001"] }],
          deck: [{ card: "BT1-001", as: "notDrawn" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });
});
