import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-054.js";
import "./EX2-054.js";
import "./EX2-007.js";
import "./EX2-046.js";
import "./EX2-050.js";
import "../BT1/BT1-018.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-054 ADR-09 Gatekeeper", () => {
  it("matches the catalog and compiled Security, On Play, and Opponent's Turn clauses", () => {
    expect(getCardDefinition("EX2-054")).toMatchObject({
      cardId: "EX2-054",
      nameEn: "ADR-09 Gatekeeper",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 11,
      dp: 10000,
      evoCosts: [],
      forms: ["D-Reaper"],
      types: ["Base Defense Agent"],
      rarity: "C",
      maxCountInDeck: 4,
      effectText:
        "[Security] Play this card without battling and without paying its memory cost.[On Play] If you have a [Mother D-Reaper] in play, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.)[Opponent's Turn] While you have a [Mother D-Reaper] with 6 or more digivolution cards in play, all of your opponent's Digimon gain ＜Security Attack -1＞. (This Digimon checks 1 fewer security cards.)",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
            },
          ],
        },
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "name" }],
                },
              },
            },
          ],
        },
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "Aura",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
              effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: -1 } },
              while: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "name" }],
                  digivolutionCardsAtLeast: 6,
                },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("recovers 1 on play while Mother D-Reaper is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-007"],
          hand: [{ card: "EX2-054", as: "gatekeeper" }],
          deck: [{ card: "BT1-009", as: "deckTop" }, ...inertDeck],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatekeeper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
  });

  it("does not recover without Mother D-Reaper", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX2-054", as: "gatekeeper" }],
        deck: [{ card: "BT1-009", as: "deckTop" }, ...inertDeck],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 20;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gatekeeper").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gatekeeper").topCard?.instanceId === s.inst("gatekeeper").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
  });

  it("gives every opposing Digimon Security Attack -1 with 6+ Mother sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-007", as: "mother", under: Array.from({ length: 6 }, () => "EX2-046") },
          { card: "EX2-054", as: "gatekeeper" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: {
        battleArea: [
          { card: "EX2-019", as: "first" },
          { card: "EX2-025", as: "second" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
    });
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Main);

    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(-1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("does not apply Security Attack -1 with only five Mother sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-007", as: "mother", under: Array.from({ length: 5 }, () => "EX2-046") },
          { card: "EX2-054", as: "gatekeeper" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: {
        battleArea: [{ card: "EX2-019", as: "opponent" }],
        deck: inertDeck,
        security: inertSecurity,
      },
    });
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Main);

    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("plays itself from Security without battling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-050", as: "attacker" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "EX2-007", as: "mother" }],
          deck: inertDeck,
          security: [{ card: "EX2-054", as: "securityGatekeeper" }, ...inertSecurity],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === s.inst("securityGatekeeper").instanceId,
      ),
    );
    expect(
      s.state.players[1]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === s.inst("securityGatekeeper").instanceId,
      ),
    ).toBe(true);
  });

  it("stops a second security check when its 6-card Mother reduces an attacking Security Attack +1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-018", as: "attacker" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: {
        battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 6 }, () => "EX2-046") }],
        deck: [{ card: "BT1-009", as: "recovered" }, ...inertDeck],
        security: [
          { card: "EX2-054", as: "securityGatekeeper" },
          { card: "BT1-013", as: "remaining" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === s.inst("securityGatekeeper").instanceId,
      ),
    );
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("recovered").instanceId, s.inst("remaining").instanceId]),
    );
  });
});
