import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-043.js";

describe("LM-043 Darkdramon", () => {
  it("de-digivolves one opponent and deletes all of their lowest-play-cost Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-043", as: "darkdramon" }] },
      1: { battleArea: [
        { card: "BT1-041", as: "stacked", under: ["BT1-009"] },
        { card: "BT1-009", as: "lowest" },
      ] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("darkdramon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(2);
  });
});
