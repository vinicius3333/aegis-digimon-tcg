import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-093.js";

describe("BT8-093 Yukio Oikawa", () => {
  it("suspends to gain 1 memory when one of your Myotismon Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-093", as: "yukio" }, { card: "BT8-080", as: "myotismon", suspended: true }] },
      1: { battleArea: [{ card: "BT8-017", as: "attacker" }] },
    }, { autoAcceptOptional: true });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("myotismon").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("deletes itself at the end of the opponent's turn to play MaloMyotismon from trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-093", as: "yukio", suspended: true }],
        trash: [{ card: "BT8-083", as: "maloMyotismon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    const yukioInstanceId = s.perm("yukio").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("yukio"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("maloMyotismon").instanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === yukioInstanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === yukioInstanceId)).toBe(true);
  });

  it("does not offer the end-of-turn play while unsuspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-093", as: "yukio" }],
        trash: [{ card: "BT8-083", as: "maloMyotismon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    const yukioInstanceId = s.perm("yukio").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("yukio"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === yukioInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("maloMyotismon").instanceId)).toBe(true);
  });
});
