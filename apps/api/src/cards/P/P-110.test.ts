import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-110.js";

describe("P-110 Shadramon", () => {
  it("plays exactly one Veemon or Wormmon from trash suspended when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-055", as: "base" }],
        hand: [{ card: "P-110", as: "shadramon" }],
        trash: [{ card: "EX3-004", as: "veemon" }, { card: "BT1-009", as: "wrong" }],
        deck: ["BT1-001"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("shadramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("veemon").instanceId));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("veemon").instanceId)!;
    expect(played.isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrong").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays an eligible Veemon or Wormmon from hand through the inherited On Deletion effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-025", as: "host", under: ["P-110"] }],
        hand: [{ card: "EX3-004", as: "veemon" }, { card: "BT1-009", as: "wrong" }],
      },
      1: { battleArea: [{ card: "BT4-073", suspended: true, as: "winner" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("veemon").instanceId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("veemon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wrong").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
