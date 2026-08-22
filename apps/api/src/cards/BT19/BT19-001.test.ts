import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-001 Pickmons", () => {
  it("places only a qualifying Digimon from hand under a Tamer and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-007", as: "host", under: ["BT19-001"] }, { card: "BT19-081", as: "tamer" }],
        hand: ["BT19-081", "BT19-016"],
        deck: ["BT1-001"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT19-016"));

    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT19-016")).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT19-081")).toBe(false);
    expect((s.state.players[0] as PlayerState).hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
