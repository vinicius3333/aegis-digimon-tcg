import { CardKind, EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT26-076.js";

const CARD_ID = "BT26-076";

function fakeDefinition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    colors: ["Purple"] as never,
    kinds: [CardKind.Digimon],
    playCost: 3,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function sourceFor(permanentId = "crowmon-permanent"): CardSource {
  const permanent = {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "crowmon", cardId: CARD_ID },
  } as Permanent;
  return {
    instanceId: "crowmon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(CARD_ID),
    permanent: () => permanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as CardSource;
}

function effect(timing: EffectTiming, source: CardSource, key: string) {
  const found = getEffectModule(CARD_ID)!
    .effectsForTiming(timing, source)
    .find((candidate) => candidate.effectKey.endsWith(key));
  expect(found).toBeDefined();
  return found!;
}

describe("BT26-076 Crowmon", () => {
  it("legally digivolves from a DATA SQUAD level 4 for 3 and keeps the source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-072", as: "peckmon" }],
          hand: [{ card: CARD_ID, as: "crowmon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("peckmon").permanentId,
        instanceId: s.inst("crowmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("peckmon").topCard.instanceId === s.inst("crowmon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("peckmon").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("peckmon").stack.map((card) => card.cardId)).toEqual(["BT26-072"]);
  });

  it("deletes only level 4 or lower, pays with the exact bottom face-down Tamer card, and lets the opponent choose their discard", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "crowmon" },
            {
              card: "ST24-13",
              as: "tamer",
              under: [
                { card: "BT5-022", as: "bottom", faceUp: false },
                { card: "BT5-022", as: "upper", faceUp: true },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT5-022", as: "level3" },
            { card: "BT26-044", as: "level5" },
          ],
          hand: [
            { card: "BT5-022", as: "opponentChoice" },
            { card: "BT5-022", as: "opponentOther" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level3").permanentId, s.inst("opponentChoice").instanceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("crowmon"));
    await settle(() => s.state.players[1]!.hand.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT26-044"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("opponentChoice").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("upper").instanceId]);

    const opponentDecision = s.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(s.inst("opponentChoice").instanceId),
    );
    expect(opponentDecision?.seat).toBe(1);
  });

  it("does not pay the follow-up cost when every Tamer bottom card is face up", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "crowmon" },
            { card: "ST24-13", as: "tamer", under: [{ card: "BT5-022", as: "faceUpBottom" }] },
          ],
        },
        1: { hand: [{ card: "BT5-022", as: "opponentHand" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("crowmon"));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("faceUpBottom").instanceId]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("opponentHand").instanceId]);
  });

  it("digivolves from trash for the printed cost reduced by 1 when an effect trashes the opponent's hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "crowmon" }],
          trash: [{ card: "BT26-082", as: "ravemon" }],
        },
        1: { hand: [{ card: "BT5-022", as: "opponentHand" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("opponentHand").instanceId], 0);
    await settle(() => s.perm("crowmon").topCard.instanceId === s.inst("ravemon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("crowmon").stack.map((card) => card.cardId)).toEqual([CARD_ID]);
  });

  it("does not trigger its trash digivolution during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "crowmon" }],
          trash: [{ card: "BT26-082", as: "ravemon" }],
        },
        1: { hand: [{ card: "BT5-022", as: "opponentHand" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("opponentHand").instanceId], 0);

    expect(s.perm("crowmon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT26-082");
  });

  it("inherited On Deletion offers playable Avian/Bird/DATA SQUAD cards up to cost 5, not Options or near matches", async () => {
    const source = sourceFor();
    const trash = [
      { instanceId: "avian", cardId: "avian" },
      { instanceId: "bird", cardId: "bird" },
      { instanceId: "data-tamer", cardId: "data-tamer" },
      { instanceId: "data-option", cardId: "data-option" },
      { instanceId: "too-expensive", cardId: "too-expensive" },
      { instanceId: "near-match", cardId: "near-match" },
    ];
    const definitions: Record<string, CardDefinition> = {
      avian: fakeDefinition("avian", { types: ["Avian"] }),
      bird: fakeDefinition("bird", { types: ["Bird"] }),
      "data-tamer": fakeDefinition("data-tamer", { kinds: [CardKind.Tamer], types: ["DATA SQUAD"], dp: 0 }),
      "data-option": fakeDefinition("data-option", { kinds: [CardKind.Option], types: ["DATA SQUAD"], dp: 0 }),
      "too-expensive": fakeDefinition("too-expensive", { playCost: 6, types: ["Avian"] }),
      "near-match": fakeDefinition("near-match", { types: ["Avian Dragon"] }),
    };
    const offered: string[][] = [];
    const playInstances = vi.fn(async () => []);
    const ctx = {
      source,
      trigger: { deletedInstanceIds: [source.instanceId] },
      game: {
        player: () => ({ trash }),
        definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
      } as unknown as GameAccess,
      ask: {
        selectCards: vi.fn(async (_ctx: EffectContext, options: { candidates: string[] }) => {
          offered.push(options.candidates);
          return ["data-tamer"];
        }),
      } as unknown as EffectContext["ask"],
      fx: { playInstances } as unknown as Primitives,
    } as unknown as EffectContext;

    await effect(EffectTiming.OnDestroyedAnyone, source, "inherited-on-deletion-play-avian-bird-or-data-squad").resolve(
      ctx,
    );

    expect(offered).toEqual([["avian", "bird", "data-tamer"]]);
    expect(playInstances).toHaveBeenCalledWith(["data-tamer"], { payCost: false });
  });
});
