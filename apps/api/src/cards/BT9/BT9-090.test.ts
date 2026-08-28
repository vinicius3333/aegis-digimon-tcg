import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-090.js";
import "./BT9-090.js";

describe("BT9-090 Maki Himekawa", () => {
  it("matches catalog values and the reveal, cost reduction, and security IR", () => {
    expect(getCardDefinition("BT9-090")).toMatchObject({
      colors: ["Black"], kinds: ["Tamer"], playCost: 3,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ filter: { nameOrTrait: [{ tokens: ["Tapirmon"], match: "name" }] } }, { filter: { multicolor: true, colorCount: 2, colors: ["Black"] } }], rest: "deckBottom" }] },
        {
          trigger: "YourTurn",
          actions: [{
            kind: "Replacement",
            event: "wouldDigivolve",
            into: { multicolor: true, colorCount: 2, colors: ["Black"] },
            cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
            actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
          }],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("adds Tapirmon and a two-color black card from three revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-090", as: "source" }],
          deck: [{ card: "BT9-059", as: "tapirmon" }, { card: "BT9-061", as: "black" }, "BT9-060"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("tapirmon").instanceId, s.inst("black").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});
