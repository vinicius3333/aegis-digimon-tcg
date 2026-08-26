import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-071.js";

describe("BT9-071 Dracmon", () => {
  it("matches errata and Q1862-Q1865 selection and inherited-evolution IR", () => {
    expect(getCardDefinition("BT9-071")).toMatchObject({
      cardId: "BT9-071", nameEn: "Dracmon", colors: ["Purple"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 1000, evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }], forms: ["Rookie"],
      attributes: ["Virus"], types: ["Undead"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand" }, { to: "trash" }] }] },
        { trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Digivolve", payCost: true, optional: true, into: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] } } }] },
      ],
    });
  });

  it("adds one eligible card and trashes another from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-071", as: "source" }],
          deck: [{ card: "BT9-073", as: "added" }, { card: "BT9-077", as: "trashed" }, "BT9-070"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((c) => c.instanceId === s.inst("added").instanceId) &&
        player.trash.some((c) => c.instanceId === s.inst("trashed").instanceId),
    );
    expect(player.deck).toHaveLength(1);
  });
});
