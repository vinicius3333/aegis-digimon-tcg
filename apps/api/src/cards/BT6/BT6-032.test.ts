import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-032.js";
import "./BT6-041.js";

describe("BT6-032 Tapirmon", () => {
  it("draws once when its host removes a card from your security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-041", under: ["BT6-032", "BT6-035"], as: "host" }],
          security: ["BT1-001"],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { battleArea: ["BT6-016"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});

describe("BT6-032 Tapirmon — KB Q&A rulings", () => {
  it("two Digimon with Tapirmon as a source each draw 1 when one security card is removed (Q1421)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-041", under: ["BT6-032"], as: "host" },
            { card: "BT1-014", under: ["BT6-032"] },
          ],
          security: ["BT1-014"],
          deck: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-010", as: "left" },
          ],
        },
        1: { battleArea: ["BT6-016"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("first").instanceId, s.inst("second").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("left").instanceId]);
  });
});
