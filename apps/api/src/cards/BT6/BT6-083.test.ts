import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-083.js";

describe("BT6-083 Eosmon", () => {
  it("may play a white Tamer from hand when its host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-086", under: ["BT6-083"], as: "attacker" }],
          hand: [{ card: "BT6-092", as: "tamer" }],
        },
        1: { security: ["BT6-074"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });

  it("may play a white Tamer, then lets the opponent play a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT6-083", as: "source" },
            { card: "BT6-092", as: "myTamer" },
          ],
        },
        1: { hand: [{ card: "BT6-087", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mine = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        mine.battleArea.some((p) => p.topCard?.instanceId === s.inst("myTamer").instanceId) &&
        opponent.battleArea.some((p) => p.topCard?.instanceId === s.inst("opponentTamer").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });
});
