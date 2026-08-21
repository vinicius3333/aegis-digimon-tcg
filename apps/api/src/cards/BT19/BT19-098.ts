import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, digivolveCostStatic, onDeletion, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * BT19-098 — King Device (BT19, Purple Option).
 *
 * PLACED in the battle area (it stays in play as an Option-permanent), so the placements use the
 * option-permanent placement path (`ctx.fx.placeOptionAsPermanent`).
 *
 * text reads "a use cost of 3 or less", matched here):
 *   - While you don't have [King Device], you may ignore this card's color requirements.
 *   - When an effect trashes this card in your battle area, place 1 Option card with the [Device]
 *     trait with a use cost of 3 or less from your trash into the battle area.
 *   [Main] Place 1 Option card with the [Device] trait with a use cost of 3 or less from your
 *     trash into the battle area. Then, place this card in the battle area.
 *   [Security] You may place 1 Option card with the [Device] trait from your hand in the battle
 *     area. Then, add this card to the hand.
 *
 *   EffectTiming.None (lines 15-32): rule implementation for THIS card, gated on the owner
 *     having no [King Device] in play (HasMatchConditionOwnersPermanent). -> waiveColorRequirement.
 *   EffectTiming.OnDestroyedAnyone (lines 36-111): when this card is trashed in the battle area,
 *     place 1 [Device] cost≤3 Option from trash into the battle area. -> onDeletion + placeOption.
 *   EffectTiming.OptionSkill (lines 115-188): [Main] place 1 [Device] cost≤3 Option from trash,
 *     then place THIS card into the battle area. -> activated (OnUseOption) + two placements.
 *   EffectTiming.SecuritySkill (lines 190-259): [Security] optionally place 1 [Device] Option from
 *     hand, then add this card to hand.
 */
const cardId = "BT19-098";

const hasTrait = (def: CardDefinition, trait: string): boolean => {
  const traits: string[] = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return traits.includes(trait);
};

const isOption = (def: CardDefinition): boolean => (def.kinds as string[]).includes("Option");

/** Owner has a [King Device] in play (battle area). */
const hasKingDeviceInPlay = (ctx: EffectContext, ownerSeat: Seat): boolean =>
  Array.from(ctx.game.player(ownerSeat).battleArea).some(
    (perm) => perm.topCard !== undefined && ctx.game.definitionOf(perm.topCard).nameEn === "King Device",
  );

/** [Device]-trait Option cards with a use cost of 3 or less in the owner's trash. */
const deviceOptionsInTrash = (ctx: EffectContext, ownerSeat: Seat): CardInstance[] =>
  Array.from(ctx.game.player(ownerSeat).trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isOption(def) && hasTrait(def, "Device") && def.playCost <= 3;
  });

/** [Device]-trait Option cards in the owner's hand (no cost restriction — [Security]). */
const deviceOptionsInHand = (ctx: EffectContext, ownerSeat: Seat): CardInstance[] =>
  Array.from(ctx.game.player(ownerSeat).hand).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isOption(def) && hasTrait(def, "Device");
  });

/** Place 1 [Device] cost≤3 Option from trash into the battle area (the shared trash-place body). */
const placeDeviceFromTrash = async (ctx: EffectContext, ownerSeat: Seat): Promise<void> => {
  const candidates = deviceOptionsInTrash(ctx, ownerSeat);
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  const picked = chosen[0];
  if (picked !== undefined) await ctx.fx.placeOptionAsPermanent?.(picked);
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Static + the trashed-from-battle-area clause both live under EffectTiming.None / the
    // deletion window respectively.
    if (timing === EffectTiming.None) {
      return [
        // The waiver targets THIS card while it is still in the HAND (a use-time color-cost
        // check), so it must NOT carry an on-field base guard — `digivolveCostStatic` is the
        // no-base-guard static builder (BT6-112 uses it the same way for a hand-resident static).
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/ignore-color-when-no-king-device`,
          description: "While you don't have [King Device], you may ignore this card's color requirements.",
          optional: false,
          // card while that holds (a hand/use-time color check reads it). When a King Device is in
          // play this card IS the King Device, so the waiver stops.
          when: (ctx) => !hasKingDeviceInPlay(ctx, source.ownerSeat),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // When an effect trashes this card in your battle area, place 1 [Device] cost≤3 Option from
    // trash into the battle area.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-trashed-place-device-from-trash`,
          description:
            "When an effect trashes this card in your battle area, place 1 Option card with the " +
            "[Device] trait with a use cost of 3 or less from your trash into the battle area.",
          optional: false,
          canActivate: (ctx) => deviceOptionsInTrash(ctx, source.ownerSeat).length > 0,
          resolve: (ctx) => placeDeviceFromTrash(ctx, source.ownerSeat),
        }),
      ];
    }

    // [Main] Place 1 [Device] cost≤3 Option from trash, then place THIS card in the battle area.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-place-device-then-self`,
          description:
            "[Main] Place 1 Option card with the [Device] trait with a use cost of 3 or less from " +
            "your trash into the battle area. Then, place this card in the battle area.",
          optional: false,
          resolve: async (ctx) => {
            await placeDeviceFromTrash(ctx, source.ownerSeat);
            // Then, place THIS card in the battle area (King Device becomes an Option-permanent).
            await ctx.fx.placeOptionAsPermanent?.(source.instanceId);
          },
        }),
      ];
    }

    // [Security] Optionally place 1 [Device] Option from hand, then add this card to hand.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-place-from-hand-then-add-hand`,
          description:
            "[Security] You may place 1 Option card with the [Device] trait from your hand in the " +
            "battle area. Then, add this card to the hand.",
          optional: false,
          resolve: async (ctx) => {
            const candidates = deviceOptionsInHand(ctx, source.ownerSeat);
            if (candidates.length > 0) {
              // "You may" — optional placement.
              const willPlace = await ctx.ask.optional(
                ctx,
                "Place 1 [Device] Option card from your hand in the battle area?",
              );
              if (willPlace) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: candidates.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                const picked = chosen[0];
                if (picked !== undefined) await ctx.fx.placeOptionAsPermanent?.(picked);
              }
            }
            // Then, add THIS card (the security card) to the hand.
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

// Keep the generated contract lossless as well as the handwritten runtime module.  The
// targeted PlaceInBattleAreaSelf form is the shared IR seam for placing an arbitrary
// Option permanent from hand/trash (the interpreter routes it to placeOptionAsPermanent).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHaveNone",
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["King Device"], match: "name" }] },
            raw: "you don't have [King Device]",
          },
        },
      ],
    },
    {
      trigger: "whenTrashedFromBattleArea",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
              playCost: { op: "lte", value: 3 },
            },
            from: ["trash"],
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
              playCost: { op: "lte", value: 3 },
            },
            from: ["trash"],
            count: 1,
          },
          optional: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: {
            filter: { controller: "mine", kind: ["Option"], nameOrTrait: [{ tokens: ["Device"], match: "trait" }] },
            from: ["hand"],
            count: 1,
            optional: true,
          },
        },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerCard(module);
registerIrCard(cardId, compiled);
export default module;
