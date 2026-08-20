import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-06", () => {
  it("matches the 6000 DP security placement clause", () => {
    expect(getCardDefinition("ST21-06")?.effectText).toContain("6000 DP or lower");
    const a = runtimeCompiledCard("ST21-06")?.effects.find(x => x.trigger === "OnPlay")?.actions.find(action => action.kind === "SecurityManipulation");
    expect(a).toMatchObject({ kind: "SecurityManipulation", toTop: true });
  });
  it("retains both play and digivolve Adventure triggers", () => {
    const e = runtimeCompiledCard("ST21-06")?.effects ?? [];
    expect(e.some(x => x.trigger === "OnPlay")).toBe(true);
    expect(e.some(x => x.trigger === "WhenDigivolving")).toBe(true);
  });

  it("places exactly one opposing Digimon at 6000 DP or lower on top of security", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST21-06", as: "magna" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }, { card: "BT1-010", as: "safe", dp: 7000 }], security: ["BT1-003", "BT1-004"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).security.some((card) => card.cardId === "BT1-009"));

    expect((s.state.players[1] as PlayerState).security[0]?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
  });
});
