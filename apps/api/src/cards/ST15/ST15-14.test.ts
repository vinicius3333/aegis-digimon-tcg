import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-14 Tai Kamiya", () => {
  it("sets memory to 3 only when the player has 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST15-14", as: "tai" }] } });

    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tai"));
    expect(s.state.memory).toBe(3);

    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tai"));
    expect(s.state.memory).toBe(3);
  });

  it("suspends itself, draws 1, and gives one Digimon +2000 DP when an attack target switches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST15-14", as: "tai" },
            { card: "BT1-009", as: "digimon", dp: 3000 },
          ],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tai = s.perm("tai");
    const digimon = s.perm("digimon");
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", { attackerPermanentId: digimon.permanentId });

    expect(tai.isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
    expect(digimon.currentDP).toBe(5000);
  });

  it("cannot pay the switch effect twice while Tai is already suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST15-14", as: "tai", suspended: true },
          { card: "BT1-009", as: "digimon", dp: 3000 },
        ],
        deck: ["BT1-001"],
      },
    });
    const digimon = s.perm("digimon");
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", { attackerPermanentId: digimon.permanentId });

    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    expect(digimon.currentDP).toBe(3000);
  });
});
