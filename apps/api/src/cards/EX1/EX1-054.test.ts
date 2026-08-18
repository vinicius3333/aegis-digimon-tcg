import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-054.js";

describe("EX1-054 Boltmon", () => {
  it("has Reboot without immediately unsuspending during your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-054", as: "boltmon", suspended: true }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("boltmon"), "Reboot")).toBe(true);
    expect(s.perm("boltmon").isSuspended).toBe(true);
  });

  it("de-digivolves an opponent by 1 when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-050", as: "base" }], hand: [{ card: "EX1-054", as: "evo" }] }, 1: { battleArea: [{ card: "EX1-053", as: "target", under: ["EX1-050"] }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "EX1-050");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX1-053")).toBe(true);
  });
});
