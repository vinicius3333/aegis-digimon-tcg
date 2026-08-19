import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT17-059 Diaboromon", () => {
  it("places Doomsday Clock from hand under itself before the optional token play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-059", as: "diaboromon" }], hand: [{ card: "BT17-100", as: "clock" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("diaboromon"));
    await settle(() => s.perm("diaboromon").stack.some((card) => card.cardId === "BT17-100"));

    expect(s.perm("diaboromon").stack.some((card) => card.cardId === "BT17-100")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-100")).toBe(false);
  });
});
