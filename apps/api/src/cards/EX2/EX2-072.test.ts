import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-072.js";
import "./EX2-014.js";
import "./EX2-019.js";
import "./EX2-021.js";
import "./EX2-046.js";
import "./EX2-060.js";
import "./EX2-072.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013"];

describe("EX2-072 Blue Card", () => {
  it("matches the catalog, Q3362-Q3365, and typed compiled IR", () => {
    expect(getCardDefinition("EX2-072")).toMatchObject({
      cardId: "EX2-072",
      nameEn: "Blue Card",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      rarity: "R",
      maxCountInDeck: 4,
      effectText:
        "While you have a Tamer in play, you may use this card without meeting its color requirements.[Main] Reveal the top 5 cards of your deck. You may digivolve 1 of your Digimon into 1 non-white Digimon card among them without paying its memory cost. If you don't, add 1 Digimon card among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
      securityEffectText: "[Security] You may play 1 Tamer card from your hand without paying its memory cost.",
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
            expect.objectContaining({
              kind: "RevealAdd",
              revealCount: 5,
              digivolveOption: {
                into: { controllerDefault: "mine", kind: ["Digimon"], excludeColors: ["White"] },
                payCost: false,
                optional: true,
              },
              add: [
                {
                  filter: { controllerDefault: "mine", kind: ["Digimon"] },
                  count: 1,
                  to: "hand",
                  ifDigivolveDeclined: true,
                },
              ],
              rest: "deckBottomAnyOrder",
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        }),
      ]),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("reveals five and adds a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-060", "EX2-046"],
          hand: [{ card: "EX2-072", as: "option" }],
          deck: [{ card: "EX2-019", as: "digimon" }, ...inertDeck],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digimon").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digimon").instanceId)).toBe(true);
  });

  it("may digivolve a compatible Digimon into a revealed non-white Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "EX2-060", as: "rika" },
            { card: "EX2-046", as: "whiteSource" },
          ],
          hand: [{ card: "EX2-072", as: "blueCard" }],
          deck: [
            { card: "EX2-021", as: "kyubimon" },
            "EX2-066",
            "EX2-067",
            "EX2-068",
            "EX2-069",
            { card: "BT1-009", as: "bonusDraw" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 10;
    const memoryBefore = s.state.memory;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blueCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("renamon").topCard.instanceId === s.inst("kyubimon").instanceId);

    expect(s.perm("renamon").topCard.cardId).toBe("EX2-021");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    // Blue Card pays 3 and the revealed digivolution is free. After its [Main]
    // effect finishes, Renamon is now an evolution source, so its inherited
    // "used an Option with cost 2+" effect gains 1 memory (Q3305/Q3363).
    expect(s.state.memory).toBe(memoryBefore - 2);
    // Kyubimon's [When Digivolving] waits until Blue Card returns the remaining
    // reveals, then adds the available Plug-In from that rebuilt deck (Q3364).
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX2-066");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX2-067", "EX2-068", "EX2-069"]),
    );
  });

  it("does not waive the white color requirement without a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-014"], hand: [{ card: "EX2-072", as: "option" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("waives the white color requirement with a Tamer even when no white card is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-014", "EX2-060"],
          hand: [{ card: "EX2-072", as: "option" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
  });

  it("may decline the compatible digivolution and then adds a revealed Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-019", "EX2-060"],
          hand: [{ card: "EX2-072", as: "option" }],
          deck: [{ card: "EX2-021", as: "revealedDigimon" }, "EX2-014", "EX2-015", "EX2-031", "EX2-032"],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const digivolveDecision = s.decisions.find(({ req }) => req.kind === "selectCards");
    expect(digivolveDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digivolveDecision!.req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "selectCards").length >= 2);
    const fallbackDecision = s.decisions.filter(({ req }) => req.kind === "selectCards").at(-1);
    expect(fallbackDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: fallbackDecision!.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("revealedDigimon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedDigimon").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("revealedDigimon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-014", "EX2-015", "EX2-031", "EX2-032"]);
  });

  it("reveals all available cards when the deck has fewer than five (Q3365)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-060"],
          hand: [{ card: "EX2-072", as: "option" }],
          deck: [{ card: "BT1-009", as: "revealed" }, "BT1-013", "BT1-009"],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("revealed").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("plays a Tamer from hand without cost when revealed from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "attacker" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          hand: [{ card: "EX2-060", as: "tamer" }],
          deck: inertDeck,
          security: [{ card: "EX2-072", as: "securityOption" }, ...inertSecurity],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
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
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });
});
