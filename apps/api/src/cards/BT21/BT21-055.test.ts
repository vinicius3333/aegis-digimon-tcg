import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-055.js";
import "../index.js";

describe("BT21-055 Sunarizamon", () => {
  it("reduces eligible digivolution costs and deletes after its stack card is trashed", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const inherited = compiled.effects.find((entry) => entry.isInherited);

    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
      into: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
    });
    expect(inherited?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        sourceFilter: { isSelfRef: true },
        hostFilter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [
            { tokens: ["Mineral"], match: "trait" },
            { tokens: ["Rock"], match: "trait", orPrevious: true },
          ],
        },
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
          },
        ],
      },
    ]);
  });

  it("deletes an opposing low-play-cost Digimon when the inherited card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-055", as: "host", under: [{ card: "BT21-055", as: "stacked" }] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible" },
            { card: "BT1-010", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("stacked").instanceId],
      0,
    );

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("eligible").permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("tooExpensive").permanentId)).toBe(true);
  });
});
