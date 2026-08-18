import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-074.js";

describe("BT5-074 Troopmon", () => {
  it("may play another Troopmon from hand when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-074", as: "source" }], hand: [{ card: "BT5-074", as: "other" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    const otherId = s.inst("other").instanceId;
    await (s.engine as any).primitives.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === otherId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === otherId)).toBe(true);
  });
});
