import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-046.js";
import "./EX2-046.js";
import "./EX2-050.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-046 ADR-02 Searcher", () => {
  it("matches the catalog, Q&A, and compiled clauses", () => {
    expect(getCardDefinition("EX2-046")).toMatchObject({
      cardId: "EX2-046",
      nameEn: "ADR-02 Searcher",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 3,
      dp: 1000,
      evoCosts: [],
      forms: ["D-Reaper"],
      types: ["Intel Acquisition Agent"],
      rarity: "C",
      maxCountInDeck: 50,
      effectText:
        "You can include up to 50 copies of cards with this card's card number in your deck.When you would play this card from your hand, reduce its play cost by 2 if you don't have another [ADR-02 Searcher] in play.[Your Turn] This Digimon can't attack players.[On Play]＜Draw 1＞ (Draw 1 card from your deck.)",
      inheritedEffectText: "[Your Turn] All of your Digimon with [D-Reaper] in their traits get +1000 DP.",
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
                    kind: "youHaveNone",
                    filter: {
                      zone: "battleArea",
                      controllerDefault: "mine",
                      nameOrTrait: [{ tokens: ["ADR-02 Searcher"], match: "name" }],
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Restrict",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              restriction: "attackPlayers",
              duration: "permanent",
            },
          ],
        },
        { trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
                },
                count: "all",
              },
              amount: 1000,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("costs 2 less with no other Searcher and draws 1 on play (Q3342)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-046", as: "searcher" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("searcher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("reduces only the Searcher copy being played when two copies are in hand", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX2-046", as: "played" },
          { card: "EX2-046", as: "unplayed" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }],
        security: inertSecurity,
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("unplayed").instanceId, s.inst("drawn").instanceId]),
    );
  });

  it("pays the full cost when another ADR-02 Searcher is already in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-046", as: "existing" }],
        hand: [{ card: "EX2-046", as: "played" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId),
    );
    expect(s.state.memory).toBe(7);
  });

  it("cannot attack a player during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-046", as: "searcher" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: inertSecurity },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("searcher"), "attackPlayers")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("searcher").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
  });

  it("gives only D-Reaper Digimon +1000 DP through its inherited Your Turn aura", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-050", as: "dReaperHost", under: ["EX2-046"] },
          { card: "EX2-019", as: "nonDReaper" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { battleArea: [{ card: "EX2-050", as: "opponentDReaper" }], deck: inertDeck, security: inertSecurity },
    });
    await s.ready();
    expect(s.perm("dReaperHost").currentDP).toBe(7_000);
    expect(s.perm("nonDReaper").currentDP).toBe(1_000);
    expect(s.perm("opponentDReaper").currentDP).toBe(6_000);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("dReaperHost").currentDP).toBe(6_000);
    expect(s.perm("nonDReaper").currentDP).toBe(1_000);
    expect(s.perm("opponentDReaper").currentDP).toBe(6_000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
