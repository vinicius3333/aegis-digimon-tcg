import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT9-018.js";

describe("BT9-018 Dinorexmon", () => {
  it("suspends exactly 1 opposing Digimon and gains 1 memory per opposing Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT9-018", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-015", as: "first", dp: 7000 }, { card: "BT1-016", as: "second", dp: 7000 }, "BT1-085", "BT1-086"] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(s.state.players[1]!.battleArea.filter(permanent => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.memory).toBe(7);
  });

  it("once per turn may delete the opposing 6000-DP-or-less Digimon that became suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-018", as: "dino" }] }, 1: { battleArea: [{ card: "BT1-028", as: "target", suspended: true }] } }, { autoAcceptOptional: true });
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("target").permanentId });
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
