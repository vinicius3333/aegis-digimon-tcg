import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-054.js";

describe("BT7-054 AncientBeetlemon", () => {
  it("plays a green level 4 Hybrid from hand when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-054", as: "ancient" }], hand: [{ card: "BT6-049", as: "hybrid" }] } }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("hybrid").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
