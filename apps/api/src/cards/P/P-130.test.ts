import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-130.js";

describe("P-130 Lui Ohwada", () => {
  it("moves an eligible breeding Digimon on play, suspends, and gains memory", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "P-130", as: "lui" }], battleArea: [], breeding: { card: "BT1-009", as: "raised" } },
    }, { autoAcceptOptional: true });
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    const raisedId = s.perm("raised").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined && s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === raisedId));
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });
});
