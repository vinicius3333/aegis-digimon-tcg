import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-038.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
describe("BT26-038 Kuwagamon", () => {
  it("compiles the three suspend-and-buff windows", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 3).map((e) => e.trigger)).toEqual(["OnPlay", "WhenDigivolving", "OnMove"]);
    expect(compiled.effects[0]?.actions).toMatchObject([{ kind: "Suspend", optional: true }, { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }]);
  });
  it("preserves the inherited once-per-turn battle-won discounted digivolution", () => {
    expect(compiled.effects[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenBattleWon", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", payCost: true, costDelta: -1, optional: true }] }] });
  });

  it("publicly digivolves the battle winner with the printed one-memory reduction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-008", as: "winner", under: ["BT26-038"] }],
        hand: [{ card: "BT26-021", as: "candidate" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("winner").permanentId });

    expect(s.perm("winner").topCard.cardId).toBe("BT26-021");
    expect(s.state.memory).toBe(0);
  });
});
