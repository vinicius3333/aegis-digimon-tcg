import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-041.js";
import "./EX2-039.js";
import "./EX2-041.js";
import "./EX2-064.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-041 Dobermon", () => {
  it("matches the catalog and compiled cost-reduction/deletion clauses", () => {
    expect(getCardDefinition("EX2-041")).toMatchObject({
      cardId: "EX2-041",
      nameEn: "Dobermon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dark Animal"],
      rarity: "R",
      maxCountInDeck: 4,
      effectText:
        "When you would play this card from your hand, reduce its play cost by 2 if you have [Alice McCoy] in play.[On Deletion] Trash the top 3 cards of your deck. Then, return 1 purple Digimon card or 1 purple Tamer card from your trash to your hand.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "Static",
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "Replacement",
                  event: "wouldBePlayed",
                  mode: "reduceCost",
                  amount: 2,
                  condition: {
                    kind: "youHave",
                    filter: {
                      zone: "battleArea",
                      controllerDefault: "mine",
                      kind: ["Tamer"],
                      nameOrTrait: [{ tokens: ["Alice McCoy"], match: "name" }],
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          trigger: "OnDeletion",
          actions: [
            { kind: "TrashTopDeck", controller: "mine", amount: 3 },
            {
              kind: "Return",
              to: "hand",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  kind: ["Digimon", "Tamer"],
                  colors: ["Purple"],
                },
                count: 1,
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("reduces only the public play cost when Alice McCoy is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-064"],
          hand: [{ card: "EX2-041", as: "dobermon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dobermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX2-041"));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX2-064")).toBe(true);
  });

  it("pays the full public play cost without Alice McCoy", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "unrelated" }],
        hand: [{ card: "EX2-041", as: "dobermon" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dobermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX2-041"));
    expect(s.state.memory).toBe(5);
  });

  it("trashes three cards and returns exactly one purple card from trash after public deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "attacker" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "EX2-041", as: "dobermon", suspended: true }],
          deck: [
            { card: "BT1-009", as: "millOne" },
            { card: "BT1-013", as: "millTwo" },
            { card: "BT1-009", as: "millThree" },
          ],
          security: inertSecurity,
          trash: [
            { card: "EX2-039", as: "returnee" },
            { card: "BT1-013", as: "wrongColor" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dobermon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const returnDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("returnee").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX2-041"),
    );
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("returnee").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("dobermon").instanceId,
        s.inst("millOne").instanceId,
        s.inst("millTwo").instanceId,
        s.inst("millThree").instanceId,
        s.inst("wrongColor").instanceId,
      ]),
    );
  });

  it("keeps the purple evolution requirement and paid stack transition public", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-039", as: "source" }],
        hand: [{ card: "EX2-041", as: "dobermon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("dobermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === s.inst("dobermon").instanceId);
    expect(s.state.memory).toBe(8);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("rejects a non-purple evolution source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "wrongSource" }],
        hand: [{ card: "EX2-041", as: "dobermon" }],
        deck: inertDeck,
        security: inertSecurity,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("dobermon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
