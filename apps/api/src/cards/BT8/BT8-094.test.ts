import { describe, it, expect } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "./BT8-094.js";

describe("BT8-094 [Opponent's Turn] gain 2 memory on opponent's Lv3 breeding->battle move", () => {
  it("suspends and draws when an opposing level 5 or lower Digimon is deleted", async () => {
    const s = setup({
      0: {
        battleArea: [{ card: "BT8-094", as: "tamer" }],
        deck: [{ card: "BT8-033", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "deleted" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 0;
    const deletedInstance = s.perm("deleted").topCard!;

    await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[1]!.trash).toContainEqual(deletedInstance);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("fires when the opponent moves a level 3 Digimon from breeding to battle on their own turn", async () => {
    const s = setup({
      0: { battleArea: [{ card: "BT8-094", dp: 0, as: "tamer" }] },
      // Lv3 Rookie with DP -- legally movable
      1: { breeding: { card: "BT1-009", dp: 3000, as: "mover" } },
    });
    const mover = s.perm("mover");

    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 1; // the opponent's (seat 1's) own turn, relative to BT8-094's owner (seat 0)
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: mover.permanentId }),
    ).toEqual({ ok: true });

    await settle(() => s.state.memory !== 0, 200);

    expect(s.state.memory).not.toBe(0);
  });

  it("plays itself from a face-up Security check without memory cost", async () => {
    const s = setup({ 0: { security: [{ card: "BT8-094", as: "securityEmperor", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityEmperor"));
    expect(s.state.players[0]!.battleArea.some(permanent => permanent.topCard.instanceId === s.inst("securityEmperor").instanceId)).toBe(true);
  });
});
