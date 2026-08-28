import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-058.js";

describe("BT9-058 Dorumon", () => {
  it("matches catalog and optional X-Antibody-trait trash-to-draw IR", () => {
    expect(getCardDefinition("BT9-058")).toMatchObject({
      cardId: "BT9-058", nameEn: "Dorumon", colors: ["Black"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 2000, evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }], forms: ["Rookie"],
      attributes: ["Data"], types: ["Beast", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [{ trigger: "OnPlay", actions: [{ kind: "Draw", amount: 2, optional: true, cost: { kind: "trash", target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] }, count: 1 } } }] }],
    });
  });

  it("may trash an X Antibody card from hand to draw two", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT9-058", as: "source" },
            { card: "BT9-062", as: "cost" },
          ],
          deck: ["BT9-060", "BT9-061"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.deck.length === 0);
    expect(player.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
