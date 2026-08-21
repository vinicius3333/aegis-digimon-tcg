import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-123.js";

describe("P-123 Ukkomon", () => {
  it("hatches and gains memory when a Digimon moves from breeding", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-123", as: "ukkomon" }], breeding: { card: "BT1-009", as: "raised" }, eggDeck: ["BT1-001"] },
    }, { autoAcceptOptional: true });
    s.state.memory = 0;
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("raised").permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding !== undefined && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding).toBeDefined();
    assertNoLoudGap(s);
  });

});
