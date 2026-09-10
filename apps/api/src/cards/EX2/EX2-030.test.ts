import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-030.js";
import "./EX2-030.js";

const INERT_SECURITY = ["BT1-009", "BT1-013"];

describe("EX2-030 Monodramon", () => {
  it("matches the catalog and typed IR", () => {
    expect(getCardDefinition("EX2-030")).toMatchObject({
      cardId: "EX2-030",
      nameEn: "Monodramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mini Dragon"],
      effectText:
        "[On Play] Reveal the top 4 cards of your deck. Add all black Tamer cards among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 4,
              rest: "deckBottom",
              add: [
                {
                  count: "all",
                  to: "hand",
                  filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Black"] },
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("pays 3 and adds every black Tamer among the top four cards on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-030", as: "monodramon" }],
          deck: [
            { card: "EX2-062", as: "ryo" },
            { card: "EX2-063", as: "kazu" },
            "BT1-009",
            "BT1-013",
            "BT1-009",
            "BT1-013",
          ],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monodramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "BT1-009,BT1-013,BT1-009,BT1-013",
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ryo").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kazu").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-009", "BT1-013"]);
    expect(s.state.memory).toBe(7);
    expect(s.perm("monodramon").topCard.instanceId).toBe(s.inst("monodramon").instanceId);
  });

  it("does not add a non-black Tamer among the top four", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-030", as: "monodramon" }],
          deck: [{ card: "EX2-062", as: "black" }, "EX2-061", "BT1-009", "BT1-013"],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monodramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "EX2-061,BT1-009,BT1-013",
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX2-062")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX2-061")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-061", "BT1-009", "BT1-013"]);
  });
});
