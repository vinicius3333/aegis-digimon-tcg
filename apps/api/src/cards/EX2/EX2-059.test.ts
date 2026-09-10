import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-059.js";
import "./EX2-059.js";
import "./EX2-020.js";
import "./EX2-050.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-059 Shu-Chong Wong", () => {
  it("matches the catalog and compiled On Play, Start of Your Turn, and Security clauses", () => {
    expect(getCardDefinition("EX2-059")).toMatchObject({
      cardId: "EX2-059",
      nameEn: "Shu-Chong Wong",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      rarity: "U",
      maxCountInDeck: 4,
      effectText:
        "[On Play] You may play 1 [Lopmon] from your hand without paying its memory cost.[Start of Your Turn] If you have 3 or fewer security cards, ＜Draw 1＞. (Draw 1 card from your deck.)",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "PlayWithoutCost",
              target: {
                filter: { controller: "mine", nameOrTrait: [{ tokens: ["Lopmon"], match: "name" }] },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            }),
          ]),
        }),
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
                raw: "you have 3 or fewer security cards",
              },
            }),
          ]),
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
            }),
          ]),
        }),
      ]),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("may play Lopmon from hand for free on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-059", as: "shu" },
            { card: "EX2-020", as: "lopmon" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shu").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("lopmon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("lopmon").instanceId),
    ).toBe(true);
  });

  it("draws at the start of turn with three or fewer Security, but not four", async () => {
    const eligible = setupEngine({
      0: {
        battleArea: [{ card: "EX2-059", as: "shu" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    await eligible.ready();
    const eligibleTurn = eligible.engine.runOneTurn();
    await advance(eligible.engine).waitForMainPhase(0);
    expect(eligible.state.players[0]!.hand.map((card) => card.instanceId)).toContain(eligible.inst("drawn").instanceId);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;

    const boundary = setupEngine({
      0: {
        battleArea: [{ card: "EX2-059", as: "shu" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
        security: [...inertSecurity, "BT1-013"],
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    await boundary.ready();
    const boundaryTurn = boundary.engine.runOneTurn();
    await advance(boundary.engine).waitForMainPhase(0);
    expect(boundary.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(
      boundary.inst("drawn").instanceId,
    );
    advance(boundary.engine).endMainPhaseIfOpen(0);
    await boundaryTurn;
  });

  it("keeps an eligible Lopmon in hand when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-059", as: "shu" },
            { card: "EX2-020", as: "lopmon" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shu").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("shu").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("lopmon").instanceId);
  });

  it("plays from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: [{ card: "EX2-059", as: "securityShu" }, ...inertSecurity] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityShu").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityShu").instanceId)).toBe(
      true,
    );
  });
});
