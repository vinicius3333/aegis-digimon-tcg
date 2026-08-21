import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-01.js";

// ST16-01 Tsunomon inherited: [When Attacking] if you have 6 or fewer cards
// in hand, draw 1. The boundary is inclusive and is evaluated at declaration.
const HOST = "ST16-03";
const EGG = "ST16-01";
const DRAW = "BT1-009";

describe("ST16-01 Tsunomon inherited When Attacking", () => {
  it("draws exactly one card with six cards in hand", async () => {
    const s = setupEngine({
      0: {
        hand: [DRAW, DRAW, DRAW, DRAW, DRAW, DRAW],
        deck: [DRAW],
        battleArea: [{ card: HOST, as: "host", under: [EGG] }],
      },
      1: { security: [DRAW] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 7, 1000);
    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not draw when the hand has seven cards", async () => {
    const s = setupEngine({
      0: {
        hand: [DRAW, DRAW, DRAW, DRAW, DRAW, DRAW, DRAW],
        deck: [DRAW],
        battleArea: [{ card: HOST, as: "host", under: [EGG] }],
      },
      1: { security: [DRAW] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 1000);
    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
