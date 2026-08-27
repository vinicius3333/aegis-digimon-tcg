import { describe, expect, it, vi } from "vitest";
import {
  CardKind,
  EffectTiming,
  Phase,
  digivolutionRequirementsFor,
  requireCardDefinition,
  type CardDefinition,
  type Seat,
} from "@aegis/shared";
import { definitionMatches } from "../../engine/effects/interpreter.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, Primitives } from "../../engine/effects/EffectContext.js";
import { compiled } from "./BT26-018.js";
import "../index.js";

const CARD_ID = "BT26-018";

function definition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? ([CardKind.Digimon] as never),
    colors: over.colors ?? [],
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 1000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(): CardSource {
  return {
    instanceId: "sangomon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "sangomon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-018 reveal movement boundaries", () => {
  it("requires one eligible add, orders the remainder, and retains a pick whose hand move fails", async () => {
    const cards = [
      { instanceId: "aqua", cardId: "AQUA" },
      { instanceId: "sea", cardId: "SEA" },
      { instanceId: "ds", cardId: "DS" },
      { instanceId: "plain", cardId: "PLAIN" },
    ];
    const cardSource = source();
    const selectCards = vi.fn<() => Promise<string[]>>(async () => ["aqua"]);
    const orderCards = vi.fn<(_ctx: EffectContext, request: { candidates: string[] }) => Promise<string[]>>(
      async (_ctx, request) => [...request.candidates].reverse(),
    );
    const returnToDeck = vi.fn<(ids: string[], options: { toTop: boolean }) => void>();
    const ctx = {
      source: cardSource,
      game: {
        player: (seat: Seat) => (seat === 0 ? { deck: cards } : { battleArea: [] }),
        opponentOf: () => 1 as Seat,
        definitionOf: (card: { cardId: string }) =>
          definition({
            types:
              card.cardId === "AQUA"
                ? ["Aqua"]
                : card.cardId === "SEA"
                  ? ["Sea Animal"]
                  : card.cardId === "DS"
                    ? ["DS"]
                    : [],
          }),
      },
      ask: { selectCards, orderCards },
      fx: {
        reveal: async () => cards,
        returnToHand: async () => [],
        returnToDeck,
      } as unknown as Primitives,
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve(ctx);

    expect(selectCards).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ candidates: ["aqua", "sea", "ds"], min: 1, max: 1 }),
    );
    expect(orderCards).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        candidates: ["sea", "ds", "plain"],
        visibleCards: cards.slice(1),
        destination: "deckBottom",
      }),
    );
    expect(returnToDeck).toHaveBeenCalledWith(["plain", "ds", "sea"], {
      toTop: false,
      suppressWhenEffectAddsToDeck: true,
    });
  });
});

describe("BT26-018 public engine behavior", () => {
  it("models the printed Rule trait and the Aqua/Sea Animal substring filters", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }],
    });
    const add = compiled.effects.find((effect) => effect.trigger === "OnPlay")!.actions[0]! as {
      kind: string;
      add: { filter: { nameOrTrait?: { tokens: string[]; match: string }[] }; orFilters?: unknown[] }[];
    };
    expect(add.add[0]!.filter.nameOrTrait).toEqual([{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }]);
    expect(add.add[0]!.orFilters).toEqual([{ nameOrTrait: [{ tokens: ["DS"], match: "trait" }] }]);
    expect(definitionMatches(add.add[0]!.filter as never, requireCardDefinition("BT15-025"))).toBe(true);
    expect(definitionMatches(add.add[0]!.filter as never, requireCardDefinition("BT1-033"))).toBe(true);
    expect(definitionMatches(add.add[0]!.orFilters![0] as never, requireCardDefinition("BT26-020"))).toBe(true);
    expect(definitionMatches(add.add[0]!.orFilters![0] as never, requireCardDefinition("BT1-009"))).toBe(false);
  });

  it("adds a card with the Aqua substring and leaves the other revealed cards on the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sangomon" }],
          deck: [
            { card: "BT15-025", as: "aquatic" },
            { card: "BT1-009", as: "plainOne" },
            { card: "BT1-010", as: "plainTwo" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-083", as: "target", under: [{ card: "BT1-001", as: "bottom" }] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0 && s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("aquatic").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("plainOne").instanceId,
      s.inst("plainTwo").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("matches its rule-granted Aquatic trait while it is a loose card", () => {
    const sangomon = requireCardDefinition(CARD_ID);

    expect(definitionMatches({ nameOrTrait: [{ tokens: ["Aquatic"], match: "trait" }] }, sangomon)).toBe(true);
    expect(definitionMatches({ nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }] }, sangomon)).toBe(false);
  });

  it("plays for 3, resolves reveal zones/order, then trashes the opponent's bottom source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sangomon" }],
          deck: [
            { card: "BT26-020", as: "dsMatch" },
            { card: "BT1-009", as: "plainOne" },
            { card: "BT1-010", as: "plainTwo" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-083",
              as: "target",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT1-002", as: "remaining" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1 && s.state.players[0]!.deck.length === 2);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("dsMatch").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("plainOne").instanceId,
      s.inst("plainTwo").instanceId,
    ]);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("When Moving still processes Then with an empty deck and binds only to this mover", async () => {
    const s = setupEngine({
      0: { breeding: { card: CARD_ID, as: "mover" } },
      1: {
        battleArea: [{ card: "BT1-083", as: "target", under: [{ card: "BT1-001", as: "bottom" }] }],
      },
    });
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("grants rule Aquatic to itself and inherited Jamming only to a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "topSangomon" },
          { card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "sourceSangomon" }] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("topSangomon"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("topSangomon"), "Jamming")).toBe(false);
  });

  it("uses inherited Jamming to survive a losing security battle while a top-card copy does not", async () => {
    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID }] }] },
      1: { security: [{ card: "BT26-017", as: "securityDigimon" }] },
    });
    expect(
      inherited.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: inherited.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => inherited.state.players[1]!.security.length === 0);
    expect(inherited.state.players[0]!.battleArea).toHaveLength(1);

    const topCard = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "sangomon" }] },
      1: { security: [{ card: "BT26-017", as: "securityDigimon" }] },
    });
    expect(
      topCard.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: topCard.perm("sangomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => topCard.state.players[0]!.battleArea.length === 0);
  });

  it("uses the normalized Lv.2 DS alternate requirement at exact cost 0", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([{ level: 2, traits: ["DS"], cost: 0, isAlternate: true }]);
    const s = setupEngine({
      0: {
        breeding: { card: "EX8-002", as: "dsEgg" },
        hand: [{ card: CARD_ID, as: "sangomon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dsEgg").permanentId,
        instanceId: s.inst("sangomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dsEgg").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("dsEgg").stack.map((card) => card.cardId)).toEqual(["EX8-002"]);

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "nonDsEgg" },
        hand: [{ card: CARD_ID, as: "sangomon" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonDsEgg").permanentId,
        instanceId: invalid.inst("sangomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(invalid.perm("nonDsEgg").topCard.cardId).toBe("BT26-001");
  });
});
