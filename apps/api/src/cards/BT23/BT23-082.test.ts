import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT23-082.js";

describe("BT23-082 Makiko Date", () => {
  it("returns this Tamer and plays a level 3 CS Digimon after a qualifying digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-082", as: "makiko" },
            { card: "BT23-006", as: "subject" },
          ],
          hand: [{ card: "BT23-026", as: "lopmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("subject").permanentId,
    });

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT23-082");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-026")).toBe(true);
  });

  it("does not trigger for a non-qualifying digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-082", as: "makiko" },
          { card: "BT1-028", as: "subject" },
        ],
      },
    });

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("subject").permanentId,
    });

    expect(s.perm("makiko").permanentId).toBeDefined();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-082")).toBe(false);
  });
});
