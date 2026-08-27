import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-113.js";

describe("BT4-113 AncientGreymon", () => {
  it("gets Security Attack +1 for each qualifying Greymon or Hybrid source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-113", as: "ancient", under: ["BT12-009", "BT12-013", "BT3-015"] }],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("ancient"), "SecurityAttack")).toBe(3);
  });

  it("may play a red level 4 or lower Hybrid from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-113", as: "ancient", under: ["BT3-015"] }],
          hand: [
            { card: "BT12-013", as: "hybrid" },
            { card: "BT3-011", as: "nonHybrid" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-013"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-013")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-011")).toBe(true);
  });

  it("does not play a Hybrid when the optional deletion effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-113", as: "ancient", under: ["BT3-015"] }],
          hand: [{ card: "BT12-013", as: "hybrid" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-013")).toBe(true);
  });
});
