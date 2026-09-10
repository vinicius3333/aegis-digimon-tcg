import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-062.js";
import "./EX2-035.js";
import "./EX2-062.js";
import "./EX2-050.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-062 Ryo Akiyama", () => {
  it("matches the catalog and compiled On Play, attack, and Security clauses", () => {
    expect(getCardDefinition("EX2-062")).toMatchObject({
      cardId: "EX2-062",
      nameEn: "Ryo Akiyama",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      rarity: "R",
      maxCountInDeck: 4,
      effectText:
        "[On Play] Reveal the top 4 cards of your deck. Add 1 card with [Dramon] or [Justimon] in its name among them to your hand. Place the remaining cards at the bottom of your deck in any order.[Your Turn] When you attack with a black Digimon, you may suspend this Tamer to have that Digimon get +1000 DP until the end of your opponent's turn.",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "RevealAdd",
              revealCount: 4,
              add: expect.arrayContaining([
                expect.objectContaining({
                  filter: {
                    controllerDefault: "mine",
                    nameOrTrait: [{ tokens: ["Dramon", "Justimon"], match: "name" }],
                  },
                  count: 1,
                  to: "hand",
                }),
              ]),
              rest: "deckBottom",
            }),
          ]),
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Black"] },
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "ModifyDP",
                  target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 1 },
                  amount: 1000,
                  duration: "untilOpponentTurnEnd",
                  cost: {
                    kind: "suspend",
                    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                    raw: "by suspending this Tamer",
                  },
                  optional: true,
                }),
              ]),
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

  it("adds a Dramon or Justimon card from the top four on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-062", as: "ryo" }],
          deck: [{ card: "EX2-035", as: "cyberdramon" }, ...inertDeck.slice(0, 3)],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyberdramon").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyberdramon").instanceId)).toBe(true);
  });

  it("places every unselected reveal at the deck bottom in the chosen order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-062", as: "ryo" }],
          deck: [
            { card: "EX2-035", as: "chosen" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-013", as: "second" },
            { card: "BT1-009", as: "third" },
            { card: "BT1-013", as: "untouched" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: false, autoOrderCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("chosen").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.state.pendingDecision!;
    const order = [s.inst("third").instanceId, s.inst("second").instanceId, s.inst("first").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck[1]?.instanceId === order[0]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId, ...order]);
  });

  it("gives a black attacker +1000 DP through the opponent's turn, then clears it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-035", as: "attacker" },
            { card: "EX2-062", as: "ryo" },
          ],
          hand: ["BT1-009"],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          hand: ["BT1-009"],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseDp = s.perm("attacker").currentDP;
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryo").isSuspended && s.perm("attacker").currentDP === baseDp + 1000);
    expect(s.perm("attacker").currentDP).toBe(baseDp + 1000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("attacker").currentDP).toBe(baseDp);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("plays EX2-062 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: [{ card: "EX2-062", as: "securityRyo" }, ...inertSecurity] },
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
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityRyo").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityRyo").instanceId)).toBe(
      true,
    );
  });
});
