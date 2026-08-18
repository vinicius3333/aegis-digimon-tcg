import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-113.js";

describe("BT4-113 AncientGreymon", () => {
  it("gets Security Attack +1 for each qualifying Greymon or Hybrid source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-113", as: "ancient", under: ["BT4-011", "BT4-013"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("ancient"), "SecurityAttack")).toBe(2);
  });

  it("may play a red level 4 or lower Hybrid from hand when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-113", as: "ancient" }], hand: [{ card: "BT4-011", as: "hybrid" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    await (s.engine as any).primitives.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-011"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-011")).toBe(true);
  });
});
