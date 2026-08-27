import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-008.js";
import "../BT10/BT10-011.js";

describe("BT8-008 Gammamon", () => {
  it("draws once when you play a red Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-008", as: "gammamon" }],
        hand: [{ card: "BT8-086", as: "hiro" }],
        deck: [{ card: "BT8-033", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiro").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("deletes a 3000-DP-or-lower Digimon when its 6000-DP-or-higher host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-008"] }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("gains Gammamon's non-inherited red-Tamer effect from Canoweissmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-011", as: "canoweiss", under: ["BT10-011", "BT8-008"] }],
        hand: [{ card: "BT8-086", as: "hiro" }],
        deck: [
          { card: "BT8-033", as: "drawnOne" },
          { card: "BT8-034", as: "drawnTwo" },
        ],
      },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiro").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT8-033");
  });

  it("does not delete when the host is below 6000 DP or the target is above 3000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-008"], dp: 5999 }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target", dp: 3001 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
