import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-110.js";

describe("BT12-110 Seventh Full Cluster", () => {
  it("publishes trash, main, and security effects in declarative IR", () => {
    const compiled = getCompiledCard("BT12-110");
    expect(compiled?.effects.map(({ trigger }) => trigger)).toEqual(["YourTurn", "Main", "Security"]);
  });

  it("activates from trash when Beelzemon (X Antibody) digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-085", as: "beelzemon-x" }],
          trash: [{ card: "BT12-110", as: "cluster" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("beelzemon-x").permanentId,
    });

    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT12-110")).toBe(false);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT12-110")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-015"]);
  });
});
