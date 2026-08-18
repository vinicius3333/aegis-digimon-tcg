import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-039.js";

describe("BT8-039 Rapidmon", () => {
  it("suspends one opposing Digimon per Tamer, then gives up to 3 suspended Digimon -5000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-064", as: "base" }, "BT1-085", "BT1-086"], hand: [{ card: "BT8-039", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "first" }, { card: "BT2-047", as: "second" }, { card: "BT2-047", as: "third", suspended: true }] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-039"));
    expect(s.state.players[1]!.battleArea.every(permanent => permanent.isSuspended)).toBe(true);
    expect(s.state.players[1]!.battleArea.every(permanent => permanent.currentDP === 1000)).toBe(true);
  });
});
