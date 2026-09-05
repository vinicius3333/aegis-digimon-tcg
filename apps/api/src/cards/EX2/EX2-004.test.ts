import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-004.js";
import "../ST9/ST9-10.js";

describe("EX2-004 Gummymon", () => {
  it("draws once when an opposing Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-026", as: "host", under: ["EX2-004"] }],
          hand: [{ card: "ST9-10", as: "suspender" }],
          deck: [
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "notDrawn" },
          ],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("does not draw when one of its controller's Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-026", as: "host", under: ["EX2-004"] }],
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
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
  });
});
