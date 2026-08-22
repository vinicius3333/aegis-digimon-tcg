// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "EX11-065";

function hasMineralOrRock(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Mineral" || t === "Rock");
}

async function placeUnderFromHandOrTrash(
  ctx: Parameters<NonNullable<Parameters<typeof turnTiming>[0]["resolve"]>>[0],
  source: CardSource,
  subjectPermanentId: string,
): Promise<void> {
  const selfPerm = source.permanent();
  if (selfPerm === undefined || selfPerm.isSuspended) return;
  const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
  if (!paid) return;
  const owner = ctx.game.player(source.ownerSeat);
  const fromHand = Array.from(owner.hand).filter((c) => hasMineralOrRock(ctx.game.definitionOf(c)));
  const fromTrash = Array.from(owner.trash).filter((c) => hasMineralOrRock(ctx.game.definitionOf(c)));
  const allCandidates = [...fromHand, ...fromTrash];
  if (allCandidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: allCandidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length > 0) {
    await ctx.fx.placeUnder(subjectPermanentId, chosen);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-trash-for-memory`,
          description:
            "[Start of Your Main Phase] By trashing 1 [Mineral] or [Rock] trait card from " +
            "your hand or your Digimon's digivolution cards, gain 1 memory.",
          optional: true,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const mineralCards = [
              ...Array.from(owner.hand),
              ...Array.from(owner.battleArea).flatMap((permanent) => permanent.stack),
            ].filter((c) => c?.cardId !== undefined && hasMineralOrRock(ctx.game.definitionOf(c)));
            if (mineralCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: mineralCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
                // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
                // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
                // Tamer's owner explicitly rather than the turn player.
                ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/played-sub`,
          description:
            "[All Turns] When your Digimon is played, by suspending this Tamer, you may place " +
            "1 [Mineral]/[Rock] trait card from your hand or trash as the bottom digivolution " +
            "card of that Digimon.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Digimon played, suspend + place under.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const definition = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(definition) && hasMineralOrRock(definition);
              },
              run: async (subCtx) => {
                await placeUnderFromHandOrTrash(subCtx, source, subCtx.trigger!.subjectPermanentId!);
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/digivolve-sub`,
          description:
            "[All Turns] When your Digimon digivolves, by suspending this Tamer, you may place " +
            "1 [Mineral]/[Rock] trait card from your hand or trash as the bottom digivolution " +
            "card of that Digimon.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Digimon digivolves, suspend + place under.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const definition = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(definition) && hasMineralOrRock(definition);
              },
              run: async (subCtx) => {
                await placeUnderFromHandOrTrash(subCtx, source, subCtx.trigger!.subjectPermanentId!);
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash", target: { filter: { controller: "mine", kind: ["Digimon"], zone: ["hand", "digivolutionCards"], nameOrTrait: [{ tokens: ["Mineral"], match: "trait" }, { tokens: ["Rock"], match: "trait" }] }, count: 1 }, raw: "By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards" }, optional: true, abortOnDecline: true }]
    },
    {
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: mineralRock, actions: [place] },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: mineralRock, actions: [place] }
      ]
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true
    }
  ],
  coverage: "full",
  residual: []
};

registerIrCard("EX11-065", compiled);
