import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-006.js";

describe("BT12-006 Monimon", () => {
  it("draws on deletion when its host has Save in its text", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-008", as: "host", under: ["BT12-006"] }], deck: ["BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
