import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT1-088.js";

describe("BT1-088 Izzy Izumi", () => {
  it("suspends to add a revealed Digimon to hand when a level 5 green Digimon is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-088", as: "izzy" }, { card: "BT1-078", as: "green" }], deck: [{ card: "BT1-077", as: "revealed" }] } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.perm("izzy").isSuspended).toBe(true);
  });

  it("places a revealed non-Digimon at the bottom of the deck", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-088", as: "izzy" }, { card: "BT1-078" }], deck: [{ card: "BT1-085", as: "tamer" }] } });
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("tamer").instanceId);
  });
});
