import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-041.js";

describe("BT1-041 Zudomon", () => {
  it("draws two cards on play", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-041", as: "zudomon" }],
        deck: [
          { card: "BT1-029", as: "drawnA" },
          { card: "BT1-030", as: "drawnB" },
        ],
      },
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zudomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.deck.length === 0);

    expect(player.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawnA").instanceId, s.inst("drawnB").instanceId]),
    );
  });

  it("gains exactly 1 memory when attacking while the opponent has a Digimon without sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-042", under: ["BT1-041"], as: "attacker" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "sourceLessA" },
          { card: "BT1-011", as: "sourceLessB" },
        ],
        security: ["BT1-012"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("does not count a source-less Digimon in the opponent's breeding area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-042", under: ["BT1-041"], as: "attacker" }] },
      1: { breeding: "BT1-010", security: ["BT1-011"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
  });
});
