import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT1-088.js";

describe("BT1-088 Izzy Izumi", () => {
  it("rejects play when memory is below the cost floor", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-088", as: "izzy" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("izzy").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("suspends to add a revealed Digimon to hand when a level 5 green Digimon is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-088", as: "izzy" },
            { card: "BT1-078", as: "green" },
          ],
          deck: [{ card: "BT1-077", as: "revealed" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.perm("izzy").isSuspended).toBe(true);
  });

  it("places a revealed non-Digimon at the bottom of the deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "izzy" }, { card: "BT1-078" }],
        deck: [{ card: "BT1-085", as: "tamer" }],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("tamer").instanceId);
  });

  it.each<[string, { battleArea?: string[]; breeding?: string }]>([
    ["a green level 4", { battleArea: ["BT1-070"] }],
    ["a non-green level 5", { battleArea: ["BT1-020"] }],
    ["a green level 5 only in the breeding area (Q954)", { breeding: "BT1-078" }],
  ])("cannot activate with %s", async (_label, support) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "izzy" }, ...(support.battleArea ?? [])],
        breeding: support.breeding,
        deck: [{ card: "BT1-077", as: "top" }],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));

    expect(s.perm("izzy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("top").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
