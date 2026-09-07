import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, getCardDefinition, getCompiledCard, ALL_FAMOUS_DECKS } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import { getEffectModule } from "./effects/registry.js";
import "../cards/index.js";

/**
 * Trigger-level deck oracle.
 *
 * `deckCardCoverage` proves that cards enter through their module. This matrix goes one
 * level deeper: for every unique effect-bearing playable card in every catalogued deck, it
 * drives the declared discrete windows that can be reached without inventing a card-specific
 * board state. A card-specific suite remains responsible for exact targets/counts, while this
 * catches inert RawUnparsed clauses, bad trigger routing, and source cards that only work at
 * On Play.
 */

type TriggerName = string;

const playableDeckCards = [
  ...new Set([...ALL_FAMOUS_DECKS].flatMap((deck) => [...deck.decklist.mainDeck, ...deck.decklist.eggDeck])),
].filter((cardId) => {
  const definition = getCardDefinition(cardId);
  return (
    definition !== undefined &&
    definition.kinds.some((kind) => kind === CardKind.Digimon || kind === CardKind.Tamer || kind === CardKind.Option) &&
    (definition.effectText !== undefined || definition.inheritedEffectText !== undefined) &&
    getEffectModule(cardId) !== undefined
  );
});

function triggersFor(cardId: string): TriggerName[] {
  const compiled = getCompiledCard(cardId);
  const compiledTriggers =
    compiled === undefined
      ? []
      : [
          ...new Set(
            compiled.effects.flatMap((effect) => {
              const trigger = (effect as typeof effect & { trigger?: unknown }).trigger;
              return Array.isArray(trigger) ? trigger.map(String) : [String(trigger)];
            }),
          ),
        ];
  if (compiledTriggers.length > 0) return compiledTriggers;
  return getEffectModule(cardId)?.declaredTriggers?.map(String) ?? [];
}

function board(cardId: string) {
  const opponentBattleArea = cardId === "EX5-041" ? [] : [{ card: "BT1-009", dp: 5000, as: "opponent" }];
  return {
    0: {
      hand: [{ card: cardId, as: "source" }],
      deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      trash: ["BT1-009", "BT1-009"],
      security: ["BT1-090", "BT1-090", "BT1-090"],
      battleArea: ["BT1-009", "BT1-086", "BT1-050", "BT1-064", "BT10-062", "BT10-071", "AD1-005"],
    },
    1: {
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-090", "BT1-090", "BT1-090"],
      battleArea: opponentBattleArea,
    },
  };
}

async function playSource(cardId: string) {
  const s = setupEngine(board(cardId), {
    autoDeclineOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    autoOrderCards: true,
  });
  s.state.memory = 50;
  const source = s.inst("source");
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId }).ok, cardId).toBe(true);
  await settle(() => false, 1000);
  await settle(() => s.state.pendingDecision === undefined, 500);
  await settle(() => false, 300);
  return s;
}

describe("catalogued deck cards — declared trigger matrix", () => {
  it("has a registered module and a declared trigger for every audited card", () => {
    expect(playableDeckCards.length).toBeGreaterThan(1000);
    const missing = playableDeckCards.filter((cardId) => {
      if (triggersFor(cardId).length > 0) return false;
      // A printed "Digivolve: ..." line is a legality requirement, not a trigger/effect.
      const definition = getCardDefinition(cardId);
      return definition?.inheritedEffectText !== undefined || !/^\s*Digivolve\s*:/i.test(definition?.effectText ?? "");
    });
    expect(missing).toEqual([]);
  });

  for (const cardId of playableDeckCards) {
    const triggers = triggersFor(cardId);
    // Each scenario owns its engine and board; the registered card catalog is read-only.
    // Overlap their async drains using Vitest's bounded concurrency (default: five).
    it.concurrent(`${cardId} resolves its declared discrete timing windows`, async () => {
      for (const trigger of triggers) {
        if (
          trigger === "OnPlay" ||
          trigger === "Static" ||
          trigger === "Rule" ||
          trigger === "YourTurn" ||
          trigger === "AllTurns" ||
          trigger === "OpponentsTurn"
        )
          continue;
        if (trigger === "Security") {
          const s = setupEngine(
            {
              0: { security: [{ card: cardId, as: "securitySource" }, "BT1-090", "BT1-090"] },
              1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
            },
            { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
          );
          await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securitySource"));
          assertNoLoudGap(s);
          continue;
        }
        const s = await playSource(cardId);
        const permanent = s.state.players[0]!.battleArea.find((candidate) => candidate.topCard.cardId === cardId);
        if (permanent === undefined) {
          // Options resolve their Main body while being used and may not remain as permanents.
          // A missing permanent is therefore a valid source-zone result for non-field windows.
          continue;
        }
        if (trigger === "OnDeletion") {
          await advance(s.engine).verb.deletePermanent([permanent.permanentId]);
        } else {
          const timing =
            trigger === "WhenDigivolving"
              ? EffectTiming.WhenDigivolving
              : trigger === "WhenAttacking"
                ? EffectTiming.OnUseAttack
                : trigger === "EndOfAttack"
                  ? EffectTiming.OnEndAttack
                  : trigger === "WhenMoving"
                    ? EffectTiming.OnMove
                    : trigger === "StartOfYourMainPhase"
                      ? EffectTiming.OnStartMainPhase
                      : trigger === "StartOfYourTurn" || trigger === "StartOfOpponentsTurn"
                        ? EffectTiming.OnStartTurn
                        : trigger === "EndOfYourTurn" || trigger === "EndOfOpponentsTurn" || trigger === "EndOfAllTurns"
                          ? EffectTiming.OnEndTurn
                          : undefined;
          if (timing !== undefined) {
            await advance(s.engine).fireForPermanent(timing, permanent, {
              attackerPermanentId: permanent.permanentId,
              subjectPermanentId: permanent.permanentId,
            });
          }
        }
        await settle(() => false, 20);
        assertNoLoudGap(s);
      }
    }, 30_000);
  }
});
