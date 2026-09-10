import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-053.js";
import "../BT11/BT11-054.js";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];
const MOTHER_SOURCES = ["EX2-046", "EX2-046", "EX2-046", "EX2-046", "EX2-046"];

describe("EX2-053 ADR-08 Optimizer", () => {
  it("matches the catalog and compiles both errata-aware once-per-turn effects", () => {
    expect(getCardDefinition("EX2-053")).toMatchObject({
      cardId: "EX2-053",
      nameEn: "ADR-08 Optimizer",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 10,
      dp: 9000,
      evoCosts: [],
      forms: ["D-Reaper"],
      types: ["Mothership Agent"],
      effectText:
        "[On Play][When Attacking][Once Per Turn] If one of your [Mother D-Reaper]s has 5 or more digivolution cards, reveal the top 3 cards of your deck. You may play 1 card with [D-Reaper] in its traits and a play cost of 10 or less among them without paying its memory cost. Place the remaining cards at the top of your deck in any order.",
    });
    const card = runtimeCompiledCard("EX2-053");
    expect(card).toEqual(compiled);
    expect(card).toBeDefined();
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toHaveLength(2);
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "deckTop",
            condition: {
              kind: "youHave",
              filter: {
                controller: "mine",
                digivolutionCardsAtLeast: 5,
                nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
              },
            },
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckTop" }],
      },
    ]);
    expect(card?.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      add: [
        {
          count: 1,
          to: "play",
          optional: true,
          filter: {
            controllerDefault: "mine",
            playCostLte: 10,
            nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
          },
        },
      ],
      rest: "deckTop",
    });
  });

  it("plays a qualifying D-Reaper from the public On Play path with five Mother sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: MOTHER_SOURCES }],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-050", as: "played" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === s.inst("played").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === s.inst("played").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(INERT_DECK);
  });

  it("does not reveal or play when the Mother D-Reaper has only four sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: MOTHER_SOURCES.slice(0, 4) }],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-050", as: "candidate" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === s.inst("optimizer").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === s.inst("candidate").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("plays a qualifying D-Reaper from the public When Attacking path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-053", as: "optimizer" },
            { card: "EX2-007", as: "mother", under: MOTHER_SOURCES },
          ],
          deck: [{ card: "EX2-050", as: "played" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("optimizer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId),
    ).toBe(true);
  });

  it("does not play a revealed D-Reaper whose printed play cost exceeds 10", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: MOTHER_SOURCES }],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-054", as: "tooExpensive" }, "BT1-009", "BT1-013"],
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tooExpensive").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("tooExpensive").instanceId);
  });

  it("returns declined revealed cards to the deck top in the errata order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: MOTHER_SOURCES }],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [
            { card: "EX2-050", as: "candidate" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-013", as: "second" },
          ],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: false, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    const decision = s.state.pendingDecision!;
    const response =
      decision.kind === "optional"
        ? { kind: "optional" as const, accept: false }
        : { kind: "selectCards" as const, instanceIds: [] };
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: decision.decisionId, response })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("candidate").instanceId,
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
  });

  it("shares one Once Per Turn budget between public On Play and When Attacking", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-080", as: "rushHost", under: ["BT11-054"] },
            { card: "EX2-007", as: "mother", under: MOTHER_SOURCES },
          ],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-050", as: "played" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredTargets,
      },
    );
    preferredTargets.push(s.inst("optimizer").instanceId);
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId) &&
        observe(s.engine).hasKeyword(s.perm("optimizer"), "Rush"),
    );
    const revealsAfterOnPlay = s.events.filter((event) => event.kind === "cardRevealed").length;
    expect(revealsAfterOnPlay).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("optimizer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.filter((event) => event.kind === "cardRevealed")).toHaveLength(revealsAfterOnPlay);
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "EX2-050")).toHaveLength(1);
  });
});
