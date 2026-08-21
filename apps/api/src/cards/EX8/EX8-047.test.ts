import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-047.js";

describe("EX8-047", () => {
  function primitivesOf(s: EngineSetup): Primitives { return (s.engine as unknown as { primitives: Primitives }).primitives; }

  it("inherits deletion from a Mineral/Rock host when this card is trashed", () =>
    expect(compiled.effects?.filter((entry) => entry.isInherited)).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", actions: [expect.objectContaining({ kind: "SubTrigger", event: "onDigivolutionCardsDiscardedBatch" })] }),
    ])));
  it("reveals 3 for Mineral/Rock and LIBERATOR cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("gains Mineral as a rule trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Mineral"],
    });
  });
  it("reveals three cards, adds Mineral and LIBERATOR matches, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-047", as: "source" }],
          deck: [
            { card: "EX8-048", as: "mineral" },
            { card: "EX8-065", as: "liberator" },
            { card: "AD1-001", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === s.inst("mineral").instanceId) &&
        player.hand.some((card) => card.instanceId === s.inst("liberator").instanceId),
    );
    expect(player.hand.some((card) => card.instanceId === s.inst("mineral").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("liberator").instanceId)).toBe(true);
    expect(player.deck.at(-1)?.instanceId).toBe(s.inst("rest").instanceId);
  });

  it("deletes an opposing low-cost Digimon from a qualifying host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-048", as: "host", under: [{ card: "EX8-047", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await s.ready();
    await primitivesOf(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("discarded").instanceId], { byEffectSeat: 0 });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });
});
