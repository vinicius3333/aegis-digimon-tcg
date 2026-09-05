import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-01.js";

describe("ST10-01 Nyaromon", () => {
  it("draws and trashes a card when its host attacks while you have a yellow Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-13", as: "host", under: ["ST10-01"] }, "ST10-02"],
          hand: [{ card: "ST10-11", as: "discard" }],
          deck: [{ card: "ST10-08", as: "drawn" }],
        },
        1: { security: ["ST10-14"] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("discard").instanceId]);
  });

  it("counts its own yellow host as the yellow Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-05", as: "host", under: ["ST10-01"] }],
          hand: [{ card: "ST10-11", as: "discard" }],
          deck: [{ card: "ST10-08", as: "drawn" }],
        },
        1: { security: ["ST10-14"] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("discard").instanceId]);
  });

  it("does not trash from hand when the conditional draw cannot draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-05", as: "host", under: ["ST10-01"] }],
          hand: [{ card: "ST10-11", as: "kept" }],
        },
        1: { security: ["ST10-14"] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kept").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
