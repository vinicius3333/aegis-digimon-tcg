import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

// A3 behavioral test for BT15-038 (Angewomon):
//   [On Play] By trashing the top or bottom card of your security stack,
//   1 of your opponent's Digimon gets -6000 DP until the end of their turn.
//
// Primary observable: playing BT15-038 with security available causes the target
// opponent Digimon to have -6000 DP applied.
//
// FAILS-WHEN-REVERTED: remove the resolve body → opp Digimon DP stays unchanged.

const ANGEWOMON = "BT15-038";
const OPP_DIGIMON = "BT1-009"; // Monodramon Lv.3, 2000 DP
const SECURITY_CARD = "BT1-001"; // any card for security stack

describe("BT15-038 Angewomon [On Play] -6000 DP with security trash cost", () => {
  it("playing Angewomon with security available reduces opp Digimon DP by 6000", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: SECURITY_CARD, as: "secCard" }],
          hand: [{ card: ANGEWOMON, as: "card" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 8000, as: "oppDigi" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true }, // "Security Top" is option index 0
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    s.state.memory = 10;

    const secCard = s.inst("secCard");
    const oppDigi = s.perm("oppDigi");
    const card = s.inst("card");

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    // Wait for DP to change on opp Digimon (8000 - 6000 = 2000).
    await settle(() => {
      const perm = p1.battleArea.find((p) => p.permanentId === oppDigi.permanentId);
      return perm !== undefined && perm.currentDP < 8000;
    }, 600);

    const perm = p1.battleArea.find((p) => p.permanentId === oppDigi.permanentId);
    expect(perm?.currentDP).toBe(2000); // 8000 - 6000
    // Security card was consumed.
    expect(p0.security.some((c) => c.instanceId === secCard.instanceId)).toBe(false);
  });

  it("recovers 1 when another effect removes a security card at 3 or fewer security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: ANGEWOMON, as: "angewomon" }],
        security: [{ card: SECURITY_CARD, as: "removed" }],
        deck: [{ card: "BT1-001", as: "recovery" }],
      },
      1: { battleArea: [{ card: OPP_DIGIMON, as: "opponent" }] },
    });

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-001");
  });
});
