import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-010.js";
import "../index.js";

describe("EX4-010 BlackWarGrowlmon", () => {
  it("trashes three cards from both decks, then uses the combined-trash DP ceiling", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashTopDeck", controller: "both", amount: 3 });
    expect(actions[1]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 0, upTo: true, totalDpCap: 3000 }, dpCeiling: 3000, dpCeilingScaling: { per: 10, amount: 2000, unit: "cards", filter: { zone: "trash", controllerDefault: "both" } } });
  });

  it("deletes opponent Digimon whose combined DP fits the post-trash ceiling", async () => {
    const s = setupEngine(
      {
        0: { deck: ["BT1-010", "BT1-011", "BT1-012"], trash: ["BT1-013", "BT1-014"], battleArea: [{ card: "EX4-010", as: "blackWarGrowlmon" }] },
        1: { deck: ["BT1-015", "BT1-016", "BT1-017"], trash: ["BT1-018", "BT1-019"], battleArea: [{ card: "BT1-009", as: "low", dp: 3000 }, { card: "BT1-009", as: "small", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("blackWarGrowlmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-009");
  });
});
