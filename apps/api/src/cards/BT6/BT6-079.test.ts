import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-079.js";

describe("BT6-079 Murmukusmon", () => {
  it("has Retaliation and plays Ornismon from trash on deletion with 10 cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-079", as: "murmukusmon" }],
          trash: [
            { card: "BT6-080", as: "ornismon" },
            "BT1-001",
            "BT1-002",
            "BT1-003",
            "BT1-004",
            "BT1-005",
            "BT1-006",
            "BT1-007",
            "BT1-008",
            "BT1-009",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("murmukusmon"), "Retaliation")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("murmukusmon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-080"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-080")).toBe(true);
  });
});

describe("BT6-079 Murmukusmon — KB Q&A rulings", () => {
  it("counts itself in the trash, so 9 trash cards become 10 and Ornismon is played (Q1468)", async () => {
    async function deleteMurmukusmonWithTrashSize(trashSize: number) {
      const fillers = ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008"];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT6-079", as: "murmukusmon" }],
            trash: [{ card: "BT6-080", as: "ornismon" }, ...fillers.slice(0, trashSize - 1)],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(s.state.players[0]!.trash).toHaveLength(trashSize);

      await advance(s.engine).verb.deletePermanent([s.perm("murmukusmon").permanentId], "byEffect");
      await settle();
      return s;
    }

    const nineBeforeDeletion = await deleteMurmukusmonWithTrashSize(9);
    expect(nineBeforeDeletion.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT6-080",
    ]);
    expect(nineBeforeDeletion.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT6-079");

    const eightBeforeDeletion = await deleteMurmukusmonWithTrashSize(8);
    expect(eightBeforeDeletion.state.players[0]!.battleArea).toHaveLength(0);
    expect(eightBeforeDeletion.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT6-080");
  });
});
