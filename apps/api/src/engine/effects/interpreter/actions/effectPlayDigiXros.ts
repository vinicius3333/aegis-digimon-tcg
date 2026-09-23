import type { EffectContext } from "../../EffectContext.js";
import { materialsSatisfyRecipe } from "../../../actions/digiXros.js";
import { digiXrosZoneExpanderFor } from "../../../digiXros/zoneExpanders.js";
import { type LooseCandidate, looseCardsInZone } from "../targeting/loose.js";
import { digiXrosRequirementFor, type ZoneRef } from "@aegis/shared";

/**
 * Prepare every optional DigiXros declaration in one effect-play batch.
 *
 * DigiXros is declared inside the play procedure, immediately before paying the play cost
 * (comprehensive §7-2-3-2), and effects that play a card also apply to a DigiXros play
 * (§7-2-2-13). The official Q&A confirms it for effect plays: Q5397 (a <Delay> play may declare
 * DigiXros or Assembly), Q2104 and Q2352 (DigiXros performed while a Digimon is played by an
 * effect). No printed card forbids it, so every effect play offers it. Declining, or having no
 * legal materials, plays the card normally (§7-2-2-12: a DigiXros isn't mandatory).
 *
 * Returns the chosen materials per played instance. `reservedMaterialInstanceIds` are cards the
 * caller already committed elsewhere in the batch.
 */
export async function prepareEffectPlayDigiXros(
  ctx: EffectContext,
  playedCards: readonly LooseCandidate[],
  reservedMaterialInstanceIds: readonly string[] = [],
): Promise<Record<string, string[]>> {
  const materialInstanceIdsByPlay: Record<string, string[]> = {};
  const playedInstanceIds = playedCards.map(({ instanceId }) => instanceId);
  const eligibleDigiXrosIds = playedCards
    .filter(({ cardId }) => digiXrosRequirementFor(cardId)?.[0] !== undefined)
    .map(({ instanceId }) => instanceId);
  if (eligibleDigiXrosIds.length === 0) return materialInstanceIdsByPlay;
  let preparedDigiXros: Record<string, string[]>;
  try {
    preparedDigiXros =
      (await ctx.fx.prepareDigiXrosPlays?.(eligibleDigiXrosIds)) ??
      Object.fromEntries(
        await (async () => {
          const entries: Array<[string, string[]]> = [];
          for (const instanceId of eligibleDigiXrosIds)
            entries.push([instanceId, (await ctx.fx.prepareDigiXrosPlay?.(instanceId)) ?? []]);
          return entries;
        })(),
      );
  } catch (error) {
    for (const pendingId of eligibleDigiXrosIds) {
      const candidate = playedCards.find((entry) => entry.instanceId === pendingId);
      if (candidate !== undefined) ctx.fx.consumeDigiXrosPlayExpansions?.(candidate.ownerSeat, pendingId);
    }
    throw error;
  }
  const reservedMaterials = new Set(reservedMaterialInstanceIds);
  try {
    for (const pendingPlayId of playedInstanceIds) {
      const playedCard = playedCards.find((candidate) => candidate.instanceId === pendingPlayId);
      const requirement = playedCard === undefined ? undefined : digiXrosRequirementFor(playedCard.cardId)?.[0];
      if (playedCard !== undefined && requirement !== undefined) {
        try {
          const replacementSourcePermanentIds = preparedDigiXros[playedCard.instanceId] ?? [];
          const ownerSeat = playedCard.ownerSeat;
          const player = ctx.game.player(ownerSeat);
          const playedDefinition = ctx.game.definitionOf({ cardId: playedCard.cardId } as never);
          const expanders = Array.from(player.battleArea).filter((permanent) => {
            if (replacementSourcePermanentIds.includes(permanent.permanentId)) return false;
            if (permanent.isSuspended || permanent.topCard === undefined) return false;
            const expander = digiXrosZoneExpanderFor(permanent.topCard.cardId);
            return expander?.appliesTo(playedDefinition) === true;
          });
          const selectedExpanderCards =
            expanders.length === 0
              ? []
              : await ctx.ask.selectCards(ctx, {
                  candidates: expanders.map((permanent) => permanent.topCard!.instanceId),
                  min: 0,
                  max: expanders.length,
                });
          const selectedExpanders = expanders.filter((permanent) =>
            selectedExpanderCards.includes(permanent.topCard!.instanceId),
          );
          // A triggered DigiXrosMaterialZoneExpansion is recorded by the canonical primitive
          // ledger. Consume that ledger here as well as the card-id registry: effect-driven
          // PlayWithoutCost must see the same extra source zones as an explicit playCard
          // declaration (EX4-062, BT19-079/087). The registry still supplies the precise
          // per-expander maxima and trait gate when a Tamer is selected interactively.
          const ledgerZones = new Set(ctx.fx.digiXrosExpandedZones?.(ownerSeat, playedCard.instanceId) ?? []);
          const ledgerCounts = ctx.fx.digiXrosExpandedZoneCounts?.(ownerSeat, playedCard.instanceId);
          const ledgerUnderTamerQuota =
            ledgerCounts === undefined
              ? ["underTamers", "underMyTamers", "underTamer", "digivolutionCards"].some((zone) =>
                  ledgerZones.has(zone as ZoneRef),
                )
                ? 1
                : 0
              : ["underTamers", "underMyTamers", "underTamer", "digivolutionCards"].reduce(
                  (total, zone) => total + (ledgerCounts[zone as ZoneRef] ?? 0),
                  0,
                );
          const ledgerTrashQuota =
            ledgerCounts === undefined ? (ledgerZones.has("trash") ? 1 : 0) : (ledgerCounts.trash ?? 0);
          const ledgerUnderTamer = ledgerUnderTamerQuota > 0;
          const selectedUnderTamerExpanders = selectedExpanders.filter((permanent) => {
            const expander = digiXrosZoneExpanderFor(permanent.topCard!.cardId);
            return expander !== undefined && expander.underTamerMax > 0;
          });
          const selectedUnrestrictedUnderTamer = selectedUnderTamerExpanders.some(
            (permanent) => digiXrosZoneExpanderFor(permanent.topCard!.cardId)?.underTamerHostScope !== "single",
          );
          // Legacy DigiXrosMaterialZoneExpansion ledger entries declare only zones and are
          // therefore independent unrestricted grants. A single-host restriction comes from
          // an interactively selected registered expander; any simultaneous legacy grant
          // intentionally overrides that restriction because it authorizes the zone on its own.
          const singleUnderTamerHost =
            selectedUnderTamerExpanders.length > 0 && !selectedUnrestrictedUnderTamer && !ledgerUnderTamer;
          const expansion = selectedExpanders.reduce(
            (current, permanent) => {
              const expander = digiXrosZoneExpanderFor(permanent.topCard!.cardId)!;
              return {
                underTamerMax: current.underTamerMax + expander.underTamerMax,
                trashMax: current.trashMax + expander.trashMax,
              };
            },
            { underTamerMax: 0, trashMax: 0 },
          );
          // The primitive ledger represents an already-paid expansion (for example,
          // a replacement effect from EX4-062/BT19-087), so it must remain usable
          // even though that Tamer is now suspended and is absent from the interactive
          // expander list. Merge it with any independently selected live expanders.
          expansion.underTamerMax += ledgerUnderTamerQuota;
          expansion.trashMax += ledgerTrashQuota;
          const defaultCandidates = [
            ...looseCardsInZone(ctx, ownerSeat, "hand").filter(
              (candidate) =>
                candidate.instanceId !== playedCard!.instanceId &&
                !playedInstanceIds.includes(candidate.instanceId) &&
                !reservedMaterials.has(candidate.instanceId),
            ),
            ...Array.from(player.battleArea).flatMap((permanent) =>
              permanent.inBreeding || permanent.topCard === undefined
                ? []
                : [
                    {
                      instanceId: permanent.topCard.instanceId,
                      cardId: permanent.topCard.cardId,
                      ownerSeat: permanent.topCard.ownerSeat,
                      hostPermanentId: permanent.permanentId,
                    },
                  ],
            ),
          ];
          const underTamerCandidates =
            expansion.underTamerMax > 0 ? looseCardsInZone(ctx, ownerSeat, "underTamers") : [];
          let scopedUnderTamerCandidates = underTamerCandidates;
          if (singleUnderTamerHost) {
            const hostIds = [...new Set(underTamerCandidates.map((candidate) => candidate.hostPermanentId))].filter(
              (hostId): hostId is string => hostId !== undefined,
            );
            const selectedHostIds =
              hostIds.length <= 1 ? hostIds : await ctx.ask.chooseTargets(ctx, { candidates: hostIds, min: 1, max: 1 });
            const selectedHostId = selectedHostIds[0];
            scopedUnderTamerCandidates =
              selectedHostId === undefined
                ? []
                : underTamerCandidates.filter((candidate) => candidate.hostPermanentId === selectedHostId);
          }
          const expandedCandidates = [
            ...scopedUnderTamerCandidates,
            ...(expansion.trashMax > 0 ? looseCardsInZone(ctx, ownerSeat, "trash") : []),
          ];
          const materialCandidates = [...defaultCandidates, ...expandedCandidates].filter(
            (candidate) =>
              !playedInstanceIds.includes(candidate.instanceId) &&
              !reservedMaterials.has(candidate.instanceId) &&
              materialsSatisfyRecipe(
                [ctx.game.definitionOf({ cardId: candidate.cardId } as never)],
                requirement.materials,
              ),
          );
          const materialCap =
            requirement.maxMaterials ??
            (requirement.materials.length === 1 ? materialCandidates.length : requirement.materials.length);
          if (materialCandidates.length === 0) continue;
          const selected = await ctx.ask.selectCards(ctx, {
            candidates: materialCandidates.map((candidate) => candidate.instanceId),
            min: 0,
            max: materialCap,
            digiXrosCardId: playedCard.cardId,
          });
          const selectedCandidates = selected
            .map((instanceId) => materialCandidates.find((candidate) => candidate.instanceId === instanceId))
            .filter((candidate): candidate is (typeof materialCandidates)[number] => candidate !== undefined);
          const selectedUnderTamer = selectedCandidates.filter((candidate) =>
            looseCardsInZone(ctx, ownerSeat, "underTamers").some(
              (underCard) => underCard.instanceId === candidate.instanceId,
            ),
          ).length;
          const selectedTrash = selectedCandidates.filter((candidate) =>
            looseCardsInZone(ctx, ownerSeat, "trash").some(
              (trashCard) => trashCard.instanceId === candidate.instanceId,
            ),
          ).length;
          const definitions = selectedCandidates.map((candidate) =>
            ctx.game.definitionOf({ cardId: candidate.cardId } as never),
          );
          if (
            selected.length > 0 &&
            selectedUnderTamer <= expansion.underTamerMax &&
            selectedTrash <= expansion.trashMax &&
            materialsSatisfyRecipe(definitions, requirement.materials)
          ) {
            if (selectedUnderTamer > 0 || selectedTrash > 0) {
              await ctx.fx.suspend(
                selectedExpanders.map((permanent) => permanent.permanentId),
                { byEffectSeat: ownerSeat, byEffectCardId: ctx.source.cardId },
              );
            }
            materialInstanceIdsByPlay[playedCard.instanceId] = selected;
            for (const materialId of selected) reservedMaterials.add(materialId);
          }
        } finally {
          // A failed/aborted picker must not leak an expansion into a later play. Persistent
          // grants are retained by the primitive and are not part of this cleanup.
          ctx.fx.consumeDigiXrosPlayExpansions?.(playedCard.ownerSeat, playedCard.instanceId);
        }
      }
    }
  } finally {
    for (const pendingId of eligibleDigiXrosIds) {
      const candidate = playedCards.find((entry) => entry.instanceId === pendingId);
      if (candidate !== undefined) ctx.fx.consumeDigiXrosPlayExpansions?.(candidate.ownerSeat, pendingId);
    }
  }
  return materialInstanceIdsByPlay;
}
