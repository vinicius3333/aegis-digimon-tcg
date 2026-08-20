import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST21-01 Tsunomon", () => {
  it("returns exactly one ADVENTURE Digimon from trash when the stack is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST21-01", as: "egg", under: ["ST21-02"] }],
        trash: ["ST21-03", "BT1-001"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireForPermanent(EffectTiming.OnDestroyedAnyone, s.perm("egg"), { removalCause: "byEffect" });
    await settle(() => (s.state.players[0] as PlayerState).hand.some((card) => card.cardId === "ST21-03"));

    const hand = (s.state.players[0] as PlayerState).hand.map((card) => card.cardId);
    expect(hand).toContain("ST21-03");
    expect(hand).not.toContain("BT1-001");
    expect((s.state.players[0] as PlayerState).trash.map((card) => card.cardId)).toContain("BT1-001");
  });
});
