import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-087.js";
import "../index.js";

describe("BT26-087 Toya Kuga", () => {
  it("compiles start-main return/memory, on-play draw, and Security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["StartOfYourMainPhase", "OnPlay", "Security"]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ optional: false });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({ optional: false });
  });
  it("returns a TS Digimon for memory and trashes a TS card for two draws", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-087", as: "toya" }], trash: [{ card: "BT26-021", as: "tsTrash" }], hand: [{ card: "BT26-021", as: "handTs" }], deck: [{ card: "BT1-001" }, { card: "BT1-002" }, { card: "BT1-003" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("toya"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck.some((c) => c.instanceId === s.inst("tsTrash").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("handTs").instanceId })).toEqual({ ok: true });
  });
});
