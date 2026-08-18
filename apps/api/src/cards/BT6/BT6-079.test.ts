import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-079.js";

describe("BT6-079 Murmukusmon", () => {
  it("has Retaliation and plays Ornismon from trash on deletion with 10 cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-079", as: "murmukusmon" }], trash: [{ card: "BT6-080", as: "ornismon" }, "BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008", "BT1-009"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("murmukusmon"), "Retaliation")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("murmukusmon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-080"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-080")).toBe(true);
  });
});
