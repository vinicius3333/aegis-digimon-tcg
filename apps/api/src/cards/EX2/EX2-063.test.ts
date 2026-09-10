import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-063.js";
import "./EX2-031.js";
import "./EX2-063.js";
import "./EX2-050.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013"];

describe("EX2-063 Kazu Shioda", () => {
  it("matches the catalog and compiled IR for all three printed clauses", () => {
    expect(getCardDefinition("EX2-063")).toMatchObject({
      cardId: "EX2-063",
      nameEn: "Kazu Shioda",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      rarity: "U",
      maxCountInDeck: 4,
      effectText:
        "[Start of Your Main Phase] If you have a Digimon with [Cyborg] or [Machine] in its traits in play, gain 1 memory.[All Turns] When one of your Digimon with [Cyborg] or [Machine] in its traits becomes suspended, you may suspend this Tamer to ＜Draw 1＞. (Draw 1 card from your deck.) Then, trash 1 card in your hand.",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourMainPhase",
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
                },
              },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenSuspended",
              sourceFilter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
              },
              actions: [
                {
                  kind: "Draw",
                  controller: "mine",
                  amount: 1,
                  cost: {
                    kind: "suspend",
                    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                    raw: "by suspending this Tamer",
                  },
                  optional: true,
                  abortOnDecline: true,
                },
                { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
            },
          ],
        }),
      ]),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("may suspend when a Machine becomes suspended to draw 1 then trash 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-031", as: "machine" },
            { card: "EX2-063", as: "kazu" },
          ],
          hand: ["BT1-009"],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && s.perm("kazu").isSuspended && s.state.players[0]!.trash.length === 1,
    );
    expect(s.perm("kazu").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("gains memory at Start of Main only with a Cyborg or Machine in play", async () => {
    const matching = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-031", as: "machine" },
          { card: "EX2-063", as: "kazu" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    matching.state.memory = 2;
    await matching.ready();
    const matchingTurn = matching.engine.startTurnLoop();
    await advance(matching.engine).waitForMainPhase(0);
    expect(matching.state.memory).toBe(3);
    expect(matching.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await matchingTurn;

    const nonMatching = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-014", as: "other" },
          { card: "EX2-063", as: "kazu" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    nonMatching.state.memory = 2;
    await nonMatching.ready();
    const nonMatchingTurn = nonMatching.engine.startTurnLoop();
    await advance(nonMatching.engine).waitForMainPhase(0);
    expect(nonMatching.state.memory).toBe(2);
    expect(nonMatching.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await nonMatchingTurn;
  });

  it("fires its All Turns draw-then-trash response during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { deck: inertDeck, security: inertSecurity },
        1: {
          battleArea: [
            { card: "EX2-063", as: "kazu" },
            { card: "EX2-031", as: "machine" },
          ],
          deck: inertDeck,
          hand: ["BT1-009"],
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("machine").isSuspended && s.perm("kazu").isSuspended);
    expect(s.perm("kazu").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("does not draw or trash when a matching suspension response is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-063", as: "kazu" },
            { card: "EX2-031", as: "machine" },
          ],
          deck: inertDeck,
          hand: ["BT1-009"],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("machine").isSuspended);
    expect(s.perm("kazu").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("ignores a suspended Digimon without the Cyborg or Machine trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-063", as: "kazu" },
            { card: "EX2-014", as: "other" },
          ],
          deck: inertDeck,
          hand: ["BT1-009"],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("other").isSuspended);
    expect(s.perm("kazu").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("plays EX2-063 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: [{ card: "EX2-063", as: "securityKazu" }, ...inertSecurity] },
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
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityKazu").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityKazu").instanceId),
    ).toBe(true);
  });
});
