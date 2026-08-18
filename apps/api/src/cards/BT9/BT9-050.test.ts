import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-050.js";

describe("BT9-050 Leomon (X Antibody)", () => {
  it("may play a Leomon source before its host is deleted in battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-050", as: "host", under: [{ card: "BT1-035", as: "leomon" }] }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const leomonId = s.perm("host").stack[0]!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === leomonId)).toBe(true);
  });
});
