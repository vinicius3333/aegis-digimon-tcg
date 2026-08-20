import { CardColor, CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-063";

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: overrides.cardId ?? "FIXTURE",
    set: overrides.set ?? "TEST",
    nameEn: overrides.nameEn ?? "Fixture",
    colors: overrides.colors ?? ([CardColor.Purple] as CardDefinition["colors"]),
    kinds: overrides.kinds ?? [CardKind.Digimon],
    playCost: overrides.playCost ?? 4,
    dp: overrides.dp ?? 4000,
    evoCosts: overrides.evoCosts ?? [],
    maxCountInDeck: overrides.maxCountInDeck ?? 4,
    types: overrides.types ?? [],
    ...overrides,
  };
}

function source(hostId = "tellermon"): CardSource {
  return {
    instanceId: `${hostId}-card`,
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: hostId }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

async function installedWatcher(cardSource: CardSource): Promise<SubTriggerInstall> {
  let installed: SubTriggerInstall | undefined;
  const ctx = {
    source: cardSource,
    trigger: {},
    game: {},
    ask: {},
    fx: {
      subscribeSubTrigger: (subscription: SubTriggerInstall) => {
        installed = subscription;
      },
    },
  } as unknown as EffectContext;
  const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.None, cardSource)[0]!;
  await effect.resolve(ctx);
  return installed!;
}

describe("BT26-063 Tellermon", () => {
  it("digivolves from a non-purple level 2 Appmon for the printed alternate cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-004", as: "tapmon" }],
        hand: [{ card: CARD_ID, as: "tellermon" }],
        deck: ["AD1-001"],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tapmon").permanentId,
        instanceId: s.inst("tellermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tapmon").topCard.instanceId === s.inst("tellermon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tapmon").stack.map((card) => card.cardId)).toEqual(["BT25-004"]);
  });

  it("links through the public action, pays cost 1, and resolves the reveal on Tellermon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tellermon" }],
          hand: [{ card: "P-190", as: "linkCard" }],
          deck: [
            { card: CARD_ID, as: "matchingTop" },
            { card: "AD1-001", as: "nonmatchA" },
            { card: "AD1-002", as: "nonmatchB" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    const linkId = s.inst("linkCard").instanceId;
    const matchingId = s.inst("matchingTop").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkId,
        targetPermanentId: s.perm("tellermon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === matchingId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("tellermon").linked.map((card) => card.instanceId)).toContain(linkId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(matchingId);
  });

  it("public link face deletes exactly 1 opponent Digimon among every tied lowest-level target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: CARD_ID, as: "tellermonLink" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-083", as: "higher" },
            { card: "BT1-089", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    const lowA = s.perm("lowA").permanentId;
    const lowB = s.perm("lowB").permanentId;
    const higher = s.perm("higher").permanentId;
    const tamer = s.perm("tamer").permanentId;
    const deleted = s.perm("lowB").topCard.instanceId;
    preferred.push(lowB);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("tellermonLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === deleted));

    const request = s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req;
    expect(new Set(request?.options?.candidateInstanceIds)).toEqual(new Set([lowA, lowB]));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([lowA, higher, tamer]),
    );
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("uses physical link identity and does not retrigger for another linked card", async () => {
    const cardSource = source("host");
    let watcher: SubTriggerInstall | undefined;
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("link-face-delete-lowest-level"))!;
    await effect.resolve({
      source: cardSource,
      fx: {
        subscribeSubTrigger: (subscription: SubTriggerInstall) => {
          watcher = subscription;
        },
      },
    } as unknown as EffectContext);

    expect(
      watcher?.matches?.({
        source: cardSource,
        trigger: { subjectPermanentId: "host", linkedCardInstanceIds: [cardSource.instanceId] },
      } as EffectContext),
    ).toBe(true);
    expect(
      watcher?.matches?.({
        source: cardSource,
        trigger: { subjectPermanentId: "host", linkedCardInstanceIds: ["different-physical-card"] },
      } as EffectContext),
    ).toBe(false);
  });

  it("does not reveal when another Appmon, rather than this Tellermon, gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tellermon" },
            { card: "BT25-045", as: "otherAppmon" },
          ],
          hand: [{ card: "P-190", as: "linkCard" }],
          deck: [
            { card: CARD_ID, as: "matchingTop" },
            { card: "AD1-001", as: "nonmatchA" },
            { card: "AD1-002", as: "nonmatchB" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    const matchingId = s.inst("matchingTop").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkCard").instanceId,
        targetPermanentId: s.perm("otherAppmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(matchingId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(matchingId);
  });

  it("gives separate Tellermon copies independent once-per-turn budgets", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "first" },
            { card: CARD_ID, as: "second" },
          ],
          deck: Array.from({ length: 6 }, (_, index) => ({ card: CARD_ID, as: `match${index}` })),
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    const revealedIds = Array.from({ length: 6 }, (_, index) => s.inst(`match${index}`).instanceId);

    // The public-action integration is covered above. Drive the same production event bus here
    // so two independent recipient events can be awaited without overlapping async intents.
    for (const [index, hostAlias] of ["first", "second"].entries()) {
      await advance(s.engine).fireSubTrigger("whenLinked", {
        subjectPermanentId: s.perm(hostAlias).permanentId,
      });
      await settle(
        () => s.state.players[0]!.hand.filter((card) => revealedIds.includes(card.instanceId)).length === index + 1,
      );
    }

    expect(s.state.players[0]!.hand.filter((card) => revealedIds.includes(card.instanceId))).toHaveLength(2);
  });

  it("fires only once for two separate links to the same Tellermon in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tellermon" }],
          deck: Array.from({ length: 6 }, (_, index) => ({ card: CARD_ID, as: `match${index}` })),
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    const revealedIds = Array.from({ length: 6 }, (_, index) => s.inst(`match${index}`).instanceId);

    for (let index = 0; index < 2; index += 1) {
      await advance(s.engine).fireSubTrigger("whenLinked", {
        subjectPermanentId: s.perm("tellermon").permanentId,
      });
    }

    expect(s.state.players[0]!.hand.filter((card) => revealedIds.includes(card.instanceId))).toHaveLength(1);
    expect(s.state.players[0]!.deck.filter((card) => revealedIds.includes(card.instanceId))).toHaveLength(5);
  });

  it("does not arm the Your Turn watcher during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "tellermon" }],
        deck: [CARD_ID, "AD1-001", "AD1-002"],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("tellermon").permanentId,
    });

    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it.each([
    [0, true],
    [1, false],
  ] as const)("honors return choice %i for the unchosen revealed cards", async (choice, toTop) => {
    const cardSource = source();
    const watcher = await installedWatcher(cardSource);
    const revealed = [
      { instanceId: "attribute-match", cardId: "ATTRIBUTE" },
      { instanceId: "form-match", cardId: "FORM" },
      { instanceId: "nonmatch", cardId: "OTHER" },
    ];
    const defs: Record<string, CardDefinition> = {
      ATTRIBUTE: definition({ cardId: "ATTRIBUTE", attributes: ["Entertainment"] }),
      FORM: definition({ cardId: "FORM", forms: ["Open"] as never }),
      OTHER: definition({ cardId: "OTHER", types: ["Seven Codes"] }),
    };
    const returnToHand = vi.fn(async () => [revealed[0]]);
    const returnToDeck = vi.fn(async () => revealed.slice(1));
    const selectCards = vi.fn(async (_ctx, opts: { candidates: string[]; visible: string[] }) => {
      expect(opts).toMatchObject({
        candidates: ["attribute-match", "form-match"],
        visible: ["attribute-match", "form-match", "nonmatch"],
        min: 1,
        max: 1,
      });
      return ["attribute-match"];
    });
    const ctx = {
      source: cardSource,
      trigger: { subjectPermanentId: "tellermon" },
      game: { definitionOf: (card: { cardId: string }) => defs[card.cardId]! } as unknown as GameAccess,
      ask: { selectCards, chooseOption: vi.fn(async () => choice) },
      fx: { reveal: vi.fn(async () => revealed), returnToHand, returnToDeck } as unknown as Primitives,
    } as unknown as EffectContext;

    expect(watcher.matches?.(ctx)).toBe(true);
    await watcher.run(ctx);

    expect(returnToHand).toHaveBeenCalledWith(["attribute-match"]);
    expect(returnToDeck).toHaveBeenCalledWith(["form-match", "nonmatch"], { toTop });
  });

  it("returns all revealed cards when none has an exact eligible trait", async () => {
    const cardSource = source();
    const watcher = await installedWatcher(cardSource);
    const revealed = [
      { instanceId: "near", cardId: "NEAR" },
      { instanceId: "plain-a", cardId: "PLAIN-A" },
      { instanceId: "plain-b", cardId: "PLAIN-B" },
    ];
    const selectCards = vi.fn();
    const returnToDeck = vi.fn(async () => revealed);
    const ctx = {
      source: cardSource,
      trigger: { subjectPermanentId: "tellermon" },
      game: {
        definitionOf: (card: { cardId: string }) =>
          definition({ cardId: card.cardId, types: card.cardId === "NEAR" ? ["Seven Codes"] : [] }),
      },
      ask: { selectCards, chooseOption: vi.fn(async () => 1) },
      fx: { reveal: vi.fn(async () => revealed), returnToDeck },
    } as unknown as EffectContext;

    await watcher.run(ctx);

    expect(selectCards).not.toHaveBeenCalled();
    expect(returnToDeck).toHaveBeenCalledWith(["near", "plain-a", "plain-b"], { toTop: false });
  });
});
