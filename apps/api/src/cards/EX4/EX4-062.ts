import { CardKind, EffectDuration, EffectTiming, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, beforePayCost, staticModifier } from "../../engine/effects/builders.js";
import { compiledEffects } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-062 — Kiriha Aonuma & Nene Amano.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Kiriha Aonuma", "Nene Amano"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "totalDigimonGte", count: 2, raw: "there are 2 or more total Digimon in play" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      optional: true,
      actions: [
        {
          kind: "DigiXrosMaterialZoneExpansion",
          zones: ["tamerCards", "trash"],
          duration: "permanent",
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/name-nene`,
          description: "Also treated as [Nene Amano].",
          when: () => true,
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm !== undefined) {
              ctx.fx.grantNameTrait(selfPerm.permanentId, "name", ["Nene Amano"], EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    // [Start of Your Main Phase] If 2+ Digimon in play, gain 1 memory
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-memory`,
          description: "[Start of Your Main Phase] If there are 2 or more Digimon in play, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            let total = 0;
            for (const player of ctx.game.state.players) {
              total += player.battleArea.filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                return ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon);
              }).length;
            }
            return total >= 2;
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [All Turns] BeforePayCost: expand DigiXros source zones
    // Uses rule implementation + rule implementation
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-digixros-zone-expansion`,
          description:
            "[All Turns] When you would play 1 Digimon card with the [Blue Flare] or " +
            "[Twilight] trait with DigiXros requirements, by suspending this Tamer, " +
            "you may place 1 card from under your Tamers and 1 card from your trash " +
            "as digivolution cards for a DigiXros.",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const def = ctx.source.definition;
            if (def === undefined) return false;
            const traits = def.types ?? [];
            const hasTrait =
              traits.includes("Blue Flare") || traits.includes("BlueFlare") || traits.includes("Twilight");
            const isDigimon = def.kinds.includes(CardKind.Digimon);
            const inHand = ctx.source.permanent() === undefined;
            return isDigimon && hasTrait && inHand;
          },
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            return perm !== undefined && !perm.isSuspended && !perm.inBreeding;
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Suspend this Tamer to use cards from under Tamers and trash for DigiXros?",
            );
            if (!wantToPay) return;

            // Pay suspend cost
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            // Expand DigiXros zones: allow 1 card from under Tamers + 1 from trash
            // These are per-card-install effects that add to the player's zone expansions
            const owner = ctx.game.player(ctx.source.ownerSeat);
            const underTamerIds: string[] = [];
            const trashIds: string[] = [];

            // Gather 1 face-down card from under any Tamer
            for (const p of owner.battleArea) {
              if (p.inBreeding || p.topCard === undefined) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (!def.kinds.includes(CardKind.Tamer)) continue;
              // Take from the bottom of the stack (face-down cards)
              for (let i = p.stack.length - 1; i >= 0; i--) {
                if (p.stack[i] !== undefined) {
                  underTamerIds.push(p.stack[i]!.instanceId);
                  break;
                }
              }
              if (underTamerIds.length > 0) break;
            }

            // Gather 1 card from trash
            if (owner.trash.length > 0) {
              trashIds.push(owner.trash[owner.trash.length - 1]!.instanceId);
            }

            const toPlace = [...underTamerIds, ...trashIds];
            if (toPlace.length === 0) return;

            // Cards that are placed as DigiXros materials go under the DigiXros target
            // They are placed during the DigiXros resolution via the engine's expanded zones
            // Record the zone expansion so the play-card subsystem can read it
            ctx.fx.expandDigiXrosZones?.(
              ctx.source.ownerSeat,
              ["digivolutionCards", "trash"],
              EffectDuration.Permanent,
            );
          },
        }),
      ];
    }

    // [Security] Play this card
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

const compiled = JSON.parse(JSON.stringify(compiledEffects[cardId]!)) as CompiledCard;
const staticEffect = compiled.effects.find((effect) => effect.trigger === "Static");
const rawAction = staticEffect?.actions[0];
if (rawAction?.kind === "RawUnparsed") {
  staticEffect.actions[0] = {
    kind: "GrantStatic",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    grant: "name",
    tokens: ["Kiriha Aonuma", "Nene Amano"],
  };
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard(cardId, compiled);
export default module;
