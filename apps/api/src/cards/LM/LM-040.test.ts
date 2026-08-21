import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-040.js";

describe("LM-040 Vikemon", () => {
  it("trashes any four opposing digivolution cards across the opponent's Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-040", as: "vikemon" }] },
      1: {
        battleArea: [
          { card: "BT1-041", as: "first", under: ["BT1-009", "BT1-009"] },
          { card: "BT1-041", as: "second", under: ["BT1-009", "BT1-009"] },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("vikemon"));
    await settle(() => s.state.players[1]!.trash.length === 4);

    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(4);
    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(0);
  });
});
