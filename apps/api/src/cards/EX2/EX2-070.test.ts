import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-070.js";
import "./EX2-014.js";
import "./EX2-019.js";
import "./EX2-060.js";
import "./EX2-070.js";
import "../BT6/BT6-050.js";
import "../BT12/BT12-028.js";
import "../BT14/BT14-039.js";
import "../BT8/BT8-039.js";
import "../index.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013"];

describe("EX2-070 Digivolution Plug-In S", () => {
  it("matches catalog, KB boundaries, and compiled IR for color, Draw 1, evolution, and Security", () => {
    expect(getCardDefinition("EX2-070")).toMatchObject({
      cardId: "EX2-070",
      nameEn: "Digivolution Plug-In S",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      rarity: "C",
      maxCountInDeck: 4,
      effectText:
        "While you have a Tamer in play, you may use this card without meeting its color requirements.[Main] ＜Draw 1＞. (Draw 1 card from your deck.) Then, you may digivolve 1 of your Digimon into a Digimon card in your hand that can digivolve for a digivolution cost of 3 or less without paying its digivolution cost.",
      securityEffectText:
        "[Security] Reveal the top 3 cards of your deck. Add 1 Digimon card among them to your hand. Place the remaining cards at the bottom of your deck in any order. Then, add this card to your hand.",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [
            {
              kind: "WaiveColorRequirement",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              condition: {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] },
                raw: "you have a Tamer in play",
              },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "Main",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              effectTextPart: "[Main] ＜Draw 1＞. (Draw 1 card from your deck.)",
            },
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              into: { controllerDefault: "mine", zone: "hand", kind: ["Digimon"], digivolutionCostMax: 3 },
              payCost: false,
              ignoreDigivolutionRequirements: false,
              optional: true,
              effectTextPart:
                "Then, you may digivolve 1 of your Digimon into a Digimon card in your hand that can digivolve for a digivolution cost of 3 or less without paying its digivolution cost.",
            },
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [{ filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 1, to: "hand" }],
              rest: "deckBottom",
            },
            { kind: "AddToHandSelf" },
          ],
        }),
      ]),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("draws 1 before its optional free digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-025", "EX2-061"],
          hand: [{ card: "EX2-070", as: "option" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("offers only an applicable printed digivolution cost of 3 or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-025", as: "terriermon" }],
          hand: [
            { card: "EX2-070", as: "option" },
            { card: "BT18-049", as: "costFour" },
            { card: "BT6-050", as: "costThree" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.instanceId === s.inst("costThree").instanceId);

    expect(s.perm("terriermon").topCard.cardId).toBe("BT6-050");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("costFour").instanceId)).toBe(true);
  });

  it("accepts an applicable special cost of 3 when the ordinary printed cost is 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-025", as: "terriermon" }],
          hand: [
            { card: "EX2-070", as: "option" },
            { card: "BT8-039", as: "specialCostThree" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.instanceId === s.inst("specialCostThree").instanceId);

    expect(s.perm("terriermon").topCard.cardId).toBe("BT8-039");
  });

  it("does not use DNA, Tamer, unmet, or reduced-cost requirements as ordinary Digivolutions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-014", as: "wrongSource" },
            { card: "EX2-060", as: "tamer" },
          ],
          hand: [
            { card: "EX2-070", as: "option" },
            { card: "BT12-028", as: "dnaTarget" },
            { card: "BT6-050", as: "tamerTarget" },
            { card: "BT14-039", as: "wrongRequirement" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("wrongSource").topCard.cardId).toBe("EX2-014");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("dnaTarget").instanceId,
        s.inst("tamerTarget").instanceId,
        s.inst("wrongRequirement").instanceId,
      ]),
    );
  });

  it("does not waive the green color requirement without a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-014", as: "blue" }], hand: [{ card: "EX2-070", as: "option" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("waives the green color requirement with a Tamer even when no green card is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-014", as: "blue" },
          { card: "EX2-060", as: "tamer" },
        ],
        hand: [{ card: "EX2-070", as: "option" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("reveals a Digimon from security, returns the other revealed cards in order, and adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-013", as: "attacker" }], deck: inertDeck, security: inertSecurity },
        1: {
          security: [{ card: "EX2-070", as: "securityOption" }, ...inertSecurity],
          deck: [
            { card: "EX2-019", as: "revealedDigimon" },
            { card: "BT1-009", as: "firstBottom" },
            { card: "BT1-013", as: "secondBottom" },
            ...inertDeck,
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
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
        s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("revealedDigimon").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    expect(s.state.players[1]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013"]);
  });
});

describe("EX2-070 Digivolution Plug-In S — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;

  async function usePlugIn(board: BoardSpec): Promise<Setup> {
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle(() => s.state.pendingDecision === undefined);
    return s;
  }

  function offered(s: Setup, alias: string): boolean {
    const instanceId = s.inst(alias).instanceId;
    return s.decisions.some(({ req }) => req.options?.candidateInstanceIds?.includes(instanceId) ?? false);
  }

  function inHand(s: Setup, alias: string): boolean {
    return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId);
  }

  it("digivolves into a card through its special digivolution cost of 3 (Q3354)", async () => {
    const s = await usePlugIn({
      0: {
        battleArea: [{ card: "BT2-056", as: "numemon" }, "EX2-060"],
        hand: [
          { card: "EX2-070", as: "option" },
          { card: "BT14-039", as: "monzaemon" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    expect(s.perm("numemon").topCard.instanceId).toBe(s.inst("monzaemon").instanceId);
    expect(s.state.memory).toBe(8);
  });

  it("cannot DNA digivolve into a card with a DNA cost of 3 or less (Q3355)", async () => {
    const s = await usePlugIn({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueFour" }, { card: "BT18-049", as: "greenFour" }, "EX2-060"],
        hand: [
          { card: "EX2-070", as: "option" },
          { card: "BT12-028", as: "paildramon" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    expect(offered(s, "paildramon")).toBe(false);
    expect(inHand(s, "paildramon")).toBe(true);
    expect(s.perm("blueFour").topCard.cardId).toBe("EX2-014");
    expect(s.perm("greenFour").topCard.cardId).toBe("BT18-049");
  });

  it("cannot digivolve a Tamer into a Digimon that can digivolve from Tamers (Q3356)", async () => {
    const s = await usePlugIn({
      0: {
        battleArea: [{ card: "EX2-061", as: "henry" }],
        hand: [
          { card: "EX2-070", as: "option" },
          { card: "BT6-050", as: "petaldramon" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    expect(offered(s, "petaldramon")).toBe(false);
    expect(inHand(s, "petaldramon")).toBe(true);
    expect(s.perm("henry").topCard.cardId).toBe("EX2-061");
    expect(s.perm("henry").stack).toHaveLength(0);
  });

  it("does not ignore digivolution requirements for a cost-3 card (Q3357)", async () => {
    const s = await usePlugIn({
      0: {
        battleArea: [{ card: "BT1-009", as: "redThree" }, "EX2-061"],
        hand: [
          { card: "EX2-070", as: "option" },
          { card: "BT6-050", as: "petaldramon" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    expect(offered(s, "petaldramon")).toBe(false);
    expect(inHand(s, "petaldramon")).toBe(true);
    expect(s.perm("redThree").topCard.cardId).toBe("BT1-009");
  });

  it("digivolves into a card whose own effect sets a digivolution cost of 3 (Q3358)", async () => {
    const s = await usePlugIn({
      0: {
        battleArea: [{ card: "EX2-020", as: "lopmon" }, "EX2-059"],
        hand: [
          { card: "EX2-070", as: "option" },
          { card: "EX2-022", as: "antylamon" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    expect(s.perm("lopmon").topCard.instanceId).toBe(s.inst("antylamon").instanceId);
    expect(s.state.memory).toBe(8);
  });

  it("does not count a <Digisorption> reduction toward the cost of 3 or less (Q3359)", async () => {
    const s = await usePlugIn({
      0: {
        battleArea: [{ card: "BT18-049", as: "greenFour" }, { card: "EX2-025", as: "suspendable" }, "EX2-061"],
        hand: [
          { card: "EX2-070", as: "option" },
          { card: "EX3-043", as: "entmon" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    expect(offered(s, "entmon")).toBe(false);
    expect(inHand(s, "entmon")).toBe(true);
    expect(s.perm("greenFour").topCard.cardId).toBe("BT18-049");
    expect(s.perm("suspendable").isSuspended).toBe(false);
  });

  it("cannot use a card's cost-4 requirement even though it also has a cost-3 one (Q3360)", async () => {
    const s = await usePlugIn({
      0: {
        battleArea: [{ card: "BT1-051", as: "yellowFour" }, "EX2-060"],
        hand: [
          { card: "EX2-070", as: "option" },
          { card: "BT14-039", as: "monzaemon" },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    expect(offered(s, "monzaemon")).toBe(false);
    expect(inHand(s, "monzaemon")).toBe(true);
    expect(s.perm("yellowFour").topCard.cardId).toBe("BT1-051");
  });
});
