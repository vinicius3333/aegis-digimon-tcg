import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier, turnTiming, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Leviamon (EX5-063, Purple Lv.6 Digimon).
// This hand-written module implements the level-extreme deletion, conditional first deletion,
// and per-opponent-Digimon memory gain specified by the card and its rulings.
const cardId = "EX5-063";

// --- opponent battle-area Digimon (source IsPermanentExistsOnOpponentBattleAreaDigimon) ---

const isOpponentBattleAreaDigimon = (ctx: EffectContext, source: CardSource, permanent: Permanent): boolean => {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  if (permanent.controllerSeat !== opponent || permanent.topCard === undefined) return false;
  return isDigimon(ctx.game.definitionOf(permanent.topCard));
};

const opponentDigimons = (ctx: EffectContext, source: CardSource): Permanent[] => {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponent).battleArea).filter((permanent) =>
    isOpponentBattleAreaDigimon(ctx, source, permanent),
  );
};

const levelOf = (ctx: EffectContext, permanent: Permanent): number | undefined =>
  permanent.topCard === undefined ? undefined : ctx.game.definitionOf(permanent.topCard).level;

// Opponent Digimon at the extreme (max / min) printed level among those that HAVE a
// level (source IsMaxLevel / IsMinLevel: Levels.Count >= 1 && level == Max()/Min()).
const opponentDigimonsAtExtremeLevel = (
  ctx: EffectContext,
  source: CardSource,
  extreme: "max" | "min",
): Permanent[] => {
  const leveled = opponentDigimons(ctx, source).filter(
    (permanent): permanent is Permanent => levelOf(ctx, permanent) !== undefined,
  );
  if (leveled.length === 0) return [];
  const levels = leveled.map((permanent) => levelOf(ctx, permanent)!);
  const target = extreme === "max" ? Math.max(...levels) : Math.min(...levels);
  return leveled.filter((permanent) => levelOf(ctx, permanent) === target);
};

// The count of the OPPONENT's Digimon whose top card actually left the field in this
// deletion window (source: AddMemory(hashtables.Count) restricted to opponent-owned
// Digimon). `deletedInstanceIds` (populated at every deletion seam — GameEngine.ts
// primitives.deletePermanent / the security-check path) carries every card instance
// that left the field, including digivolution-stack cards; `deletedWasStackInstanceIds`
// marks which of those were stack cards (not top cards), so subtracting it isolates
// one entry per deleted PERMANENT. Ownership is read from the opponent's trash, where
// each deleted top card now lives (KB Q6037/Q6038: count every opponent Digimon deleted
// in the batch, even simultaneously with others; never count the controller's own).
const opponentDeletedDigimonCount = (ctx: EffectContext, source: CardSource): number => {
  const deletedIds = ctx.trigger?.deletedInstanceIds;
  if (deletedIds === undefined || deletedIds.length === 0) return 0;
  const stackIds = new Set(ctx.trigger?.deletedWasStackInstanceIds ?? []);
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponentTrash = ctx.game.player(opponentSeat).trash;
  let count = 0;
  for (const instanceId of deletedIds) {
    if (stackIds.has(instanceId)) continue; // only top cards count as "1 Digimon deleted"
    const card = opponentTrash.find((c) => c.instanceId === instanceId);
    if (card !== undefined && isDigimon(ctx.game.definitionOf(card))) count += 1;
  }
  return count;
};

// source: opponent total Digimon + Tamers >= owner total Digimon + Tamers
const opponentHasAtLeastAsManyUnits = (ctx: EffectContext, source: CardSource): boolean => {
  const countUnits = (seat: number): number =>
    Array.from(ctx.game.player(seat as 0 | 1).battleArea).filter((permanent) => {
      if (permanent.topCard === undefined) return false;
      const def = ctx.game.definitionOf(permanent.topCard);
      return isDigimon(def) || isTamer(def);
    }).length;
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return countUnits(opponent) >= countUnits(source.ownerSeat);
};

// Ask the controller to delete 1 opponent Digimon at the given level extreme
// by the candidate's top-card instance id. Re-evaluated against current state, so the
// "lowest" pass sees the board left by the "highest" pass.
const deleteOneAtExtreme = async (ctx: EffectContext, source: CardSource, extreme: "max" | "min"): Promise<void> => {
  const candidates = opponentDigimonsAtExtremeLevel(ctx, source, extreme);
  if (candidates.length === 0) return;
  const byTopCard = new Map<string, Permanent>(
    candidates.map((permanent) => [permanent.topCard!.instanceId, permanent]),
  );
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: Array.from(byTopCard.keys()),
    min: 1,
    max: 1,
  });
  const chosenInstanceId = chosen[0];
  if (chosenInstanceId === undefined) return;
  const chosenPermanent = byTopCard.get(chosenInstanceId);
  if (chosenPermanent === undefined) return;
  await ctx.fx.deletePermanent([chosenPermanent.permanentId]);
};

// Shared [On Play] / [When Digivolving] body. The highest-level deletion is gated on the
// unit-count condition; the lowest-level deletion ("Then, ...") runs regardless of that
// condition (KB Q3666). Each deletion is independently mandatory only when a target
// exists; with none the clause contributes nothing for that step.
const deleteHighestThenLowest = async (ctx: EffectContext, source: CardSource): Promise<void> => {
  if (opponentHasAtLeastAsManyUnits(ctx, source)) {
    await deleteOneAtExtreme(ctx, source, "max");
  }
  await deleteOneAtExtreme(ctx, source, "min");
};

// area AND (the gated highest-level pass can act OR the always-on lowest-level pass can).
const deletionCanActivate = (ctx: EffectContext, source: CardSource): boolean => {
  if (!source.isOnBattleArea()) return false;
  const gatedHighestAvailable =
    opponentHasAtLeastAsManyUnits(ctx, source) && opponentDigimonsAtExtremeLevel(ctx, source, "max").length > 0;
  const lowestAvailable = opponentDigimonsAtExtremeLevel(ctx, source, "min").length > 0;
  return gatedHighestAvailable || lowestAvailable;
};

const deletionDescription = (window: "On Play" | "When Digivolving"): string =>
  `[${window}] If your opponent has as many or more total Digimon and Tamers as you, ` +
  "delete 1 of your opponent's Digimon with the highest level. " +
  "Then, delete 1 of your opponent's Digimon with the lowest level.";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Security Attack +1＞ — continuous self keyword grant (source
    // Recorded in the continuous-effect ledger via grantKeyword; the static builder
    // re-applies it each evaluation, matching the interpreter's "permanent" -> per-turn
    // convention (there is no forever EffectDuration).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack-plus-1`,
          description: "＜Security Attack +1＞ (This Digimon checks 1 additional security card.)",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
            }
          },
        }),
      ];
    }

    // [On Play] delete highest- then lowest-level opponent Digimon.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-delete-high-low`,
          description: deletionDescription("On Play"),
          optional: false,
          canActivate: (ctx) => deletionCanActivate(ctx, source),
          resolve: async (ctx) => deleteHighestThenLowest(ctx, source),
        }),
      ];
    }

    // [When Digivolving] same body.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-high-low`,
          description: deletionDescription("When Digivolving"),
          optional: false,
          canActivate: (ctx) => deletionCanActivate(ctx, source),
          resolve: async (ctx) => deleteHighestThenLowest(ctx, source),
        }),
      ];
    }

    // [All Turns] When an opponent's Digimon is deleted, gain 1 memory for each Digimon.
    // `ctx.trigger.deletedInstanceIds` / `deletedWasStackInstanceIds` (EffectContext.ts)
    // carry the deletion payload, populated at every deletion seam (GameEngine.ts
    // OnDestroyedAnyone fires). `opponentDeletedDigimonCount` isolates 1 count per
    // opponent-owned deleted Digimon (KB Q6037/Q6038: 1 memory per OPPONENT Digimon
    // deleted, even on a multi-delete; never count the controller's own).
    //
    // Seat: [All Turns] is not restricted to EX5-063's controller's own turn, so this
    // clause can fire while the OPPONENT holds priority (e.g. their attacker loses a
    // security battle against this Digimon's controller). `ctx.fx.gainMemory` credits
    // whoever's turn it is (`turnSeat`), which is wrong here -- the memory must always go
    // to EX5-063's controller (`source.ownerSeat`), so this uses `gainMemoryForSeat`.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-memory-per-deletion`,
          description: "[All Turns] When an opponent's Digimon is deleted, gain 1 memory for each Digimon.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && opponentDeletedDigimonCount(ctx, source) > 0,
          resolve: async (ctx) => {
            const count = opponentDeletedDigimonCount(ctx, source);
            if (count > 0) ctx.fx.gainMemoryForSeat(source.ownerSeat, count);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
