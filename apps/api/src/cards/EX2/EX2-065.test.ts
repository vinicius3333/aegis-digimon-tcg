import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-065.js";
import "./EX2-043.js";
import "./EX2-044.js";
import "./EX2-065.js";
import "./EX2-050.js";
import "./EX2-074.js";
import "../ST14/ST14-02.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013"];

describe("EX2-065 Ai & Mako", () => {
  it("matches the catalog, Q&A identity, and compiled IR for every clause", () => {
    expect(getCardDefinition("EX2-065")).toMatchObject({
      cardId: "EX2-065",
      nameEn: "Ai & Mako",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      rarity: "R",
      maxCountInDeck: 4,
      effectText:
        "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.[Your Turn] When you attack with a Digimon, you may suspend this Tamer to trash the top card of your deck. Then, if the attacking Digimon is [Beelzemon], you may digivolve it into a [Beelzemon Blast Mode] in your trash for a digivolution cost of 3.",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: [
            {
              kind: "SetMemory",
              value: 3,
              condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              actions: [
                { kind: "TrashTopDeck", controller: "mine", amount: 1 },
                expect.objectContaining({
                  kind: "Digivolve",
                  target: { filter: {}, count: 1, sourceRef: "triggerSubject" },
                  into: {
                    filter: {
                      zone: "trash",
                      controller: "mine",
                      nameOrTrait: [{ tokens: ["Beelzemon Blast Mode"], match: "nameExact" }],
                    },
                    count: 1,
                  },
                  from: ["trash"],
                  payCost: true,
                  costOverride: 3,
                  condition: {
                    kind: "triggerAttackerMatchesFilter",
                    filter: { nameOrTrait: [{ tokens: ["Beelzemon"], match: "nameExact" }] },
                  },
                  optional: true,
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
            },
          ],
          isSecurity: true,
        }),
      ]),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("may suspend when a Digimon attacks to trash the top card of its deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-044", as: "attacker" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: [{ card: "BT1-009", as: "milled" }, ...inertDeck],
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
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.perm("aiMako").isSuspended &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("milled").instanceId),
    );
    expect(s.perm("aiMako").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("milled").instanceId)).toBe(true);
  });

  it("may digivolve an attacking Beelzemon into Blast Mode from trash for exactly 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: [{ card: "BT1-009", as: "milled" }, ...inertDeck],
          trash: [{ card: "EX2-074", as: "blastMode" }],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beelzemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() && s.perm("beelzemon").topCard.instanceId === s.inst("blastMode").instanceId,
    );
    expect(s.perm("beelzemon").topCard.instanceId).toBe(s.inst("blastMode").instanceId);
    expect(s.perm("beelzemon").stack.map((card) => card.instanceId)).toEqual([s.inst("beelzemon").instanceId]);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("does not offer Blast Mode digivolution when the attacker is not Beelzemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-043", as: "gulfmon" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: [{ card: "BT1-009", as: "milled" }, ...inertDeck],
          trash: [{ card: "EX2-074", as: "blastMode" }],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gulfmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("aiMako").isSuspended);
    expect(s.perm("gulfmon").topCard.cardId).toBe("EX2-043");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blastMode").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at Start of Your Turn only when memory is 2 or less", async () => {
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX2-065", as: "aiMako" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: inertSecurity },
    });
    eligible.state.memory = 2;
    await eligible.ready();
    const eligibleTurn = eligible.engine.runOneTurn();
    await advance(eligible.engine).waitForMainPhase(0);
    expect(eligible.state.memory).toBe(3);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;

    const boundary = setupEngine({
      0: { battleArea: [{ card: "EX2-065", as: "aiMako" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: inertSecurity },
    });
    boundary.state.memory = 3;
    await boundary.ready();
    const boundaryTurn = boundary.engine.runOneTurn();
    await advance(boundary.engine).waitForMainPhase(0);
    expect(boundary.state.memory).toBe(3);
    advance(boundary.engine).endMainPhaseIfOpen(0);
    await boundaryTurn;
  });

  it("keeps the top card and Ai & Mako ready when the optional attack effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-044", as: "attacker" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: [{ card: "BT1-009", as: "milled" }, ...inertDeck],
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
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.perm("aiMako").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("milled").instanceId }),
    );
  });

  it("does not treat an attacking Blast Mode as explicitly named Beelzemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-074", as: "blastMode" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: [{ card: "BT1-009", as: "milled" }, ...inertDeck],
          trash: [{ card: "EX2-074", as: "otherBlast" }],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blastMode").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("aiMako").isSuspended);
    expect(s.perm("blastMode").topCard.cardId).toBe("EX2-074");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("otherBlast").instanceId)).toBe(true);
  });

  it("re-arms for a Beelzemon created during the attack (Q797 and Q3352)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST14-02", as: "impmon" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: [{ card: "BT1-009", as: "milled" }, ...inertDeck],
          trash: [
            ...Array.from({ length: 20 }, () => "BT1-009"),
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-074", as: "blastMode" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("impmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && s.perm("impmon").topCard.instanceId === s.inst("blastMode").instanceId,
    );
    expect(s.perm("impmon").stack.map((card) => card.cardId)).toEqual(["ST14-02", "EX2-044"]);
    expect(s.perm("impmon").topCard.cardId).toBe("EX2-074");
    expect(s.state.memory).toBe(4);
  });

  it("plays EX2-065 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: [{ card: "EX2-065", as: "securityAiMako" }, ...inertSecurity] },
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
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityAiMako").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityAiMako").instanceId),
    ).toBe(true);
  });
});
