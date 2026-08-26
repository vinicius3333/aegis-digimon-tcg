import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-072.js";

describe("BT9-072 Salamon", () => {
  it("matches catalog and two-color purple four-card search IR", () => {
    expect(getCardDefinition("BT9-072")).toMatchObject({
      cardId: "BT9-072", nameEn: "Salamon", colors: ["Purple"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }, { color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"], attributes: ["Vaccine"], types: ["Mammal"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [{ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ filter: { multicolor: true, colors: ["Purple"] }, count: 1, to: "hand" }] }] }],
    });
  });

  it("adds a revealed two-color purple card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-072", as: "source" }],
          deck: [{ card: "BT9-074", as: "multicolor" }, "BT9-071", "BT9-073", "BT9-077"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("multicolor").instanceId));
    expect(player.deck).toHaveLength(3);
  });
});
