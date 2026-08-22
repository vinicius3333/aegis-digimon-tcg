import { EffectTiming, EffectDuration, isDigimon, isTamer, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security } from "../../engine/effects/builders.js";
import { compiledEffects } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        { kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "name", tokens: ["Plug-In"] },
        { kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] } } },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controllerDefault: "mine", kind: ["Digimon"], levels: [6], nameOrTrait: [{ tokens: ["Gallantmon", "Sakuyamon", "MegaGargomon"], match: "name" }] }, count: 1, upTo: true, bindAs: "chosenBase" },
          into: { controllerDefault: "mine", kind: ["Digimon"], levels: [6] },
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          nameIncludesDigivolvingTarget: true,
          differentNameFromDigivolvingTarget: true,
          optional: true,
        },
      });
    }

    // [Main] Choose Lv6 → digivolve into different name-includes card from hand.
    if (timing === EffectTiming.OnUseOption) {
      out.push({
        effectKey: `${cardId}/main-digivolve`,
        description:
          "[Main] Choose 1 of your level 6 Digimon with [Gallantmon], [Sakuyamon] or [MegaGargomon] in its name. Ignoring digivolution requirements and without paying the cost, it may digivolve into a level 6 Digimon card in your hand with a different name that includes the chosen Digimon's name.",
        optional: true,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: () => true,
        canActivate: (ctx) => {
          const mine = ctx.game.player(source.ownerSeat).battleArea;
          return mine.some((p) => {
            if (p.topCard === undefined) return false;
            const def = ctx.game.definitionOf(p.topCard);
            return isDigimon(def) && def.level === 6 && [...VALID_NAMES].some((name) => def.nameEn.includes(name));
          });
        },
        resolve: async (ctx) => {
          const mine = ctx.game.player(source.ownerSeat).battleArea;
          const candidates = mine
            .filter((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) && def.level === 6 && [...VALID_NAMES].some((name) => def.nameEn.includes(name));
            })
            .map((p) => p.permanentId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: 1 });
          if (chosen.length === 0) return;
          const targetPerm = ctx.game.permanentById(chosen[0]!);
          if (!targetPerm || targetPerm.topCard === undefined) return;
          const chosenName = ctx.game.definitionOf(targetPerm.topCard).nameEn;
          const hand = ctx.game.player(source.ownerSeat).hand;
          const intoCandidates = hand.filter((c) => {
            const def = ctx.game.definitionOf(c);
            return (
              isDigimon(def) && (def.level ?? 0) === 6 && def.nameEn !== chosenName && def.nameEn.includes(chosenName)
            );
          });
          if (intoCandidates.length === 0) return;
          const intoIds = intoCandidates.map((c) => c.instanceId);
          const picked = await ctx.ask.selectCards(ctx, { candidates: intoIds, min: 0, max: 1 });
          if (picked.length === 0) return;
          await ctx.fx.digivolveFromInstance(targetPerm.permanentId, picked[0]!, {
            payCost: false,
            ignoreRequirements: true,
          });
        },
      });
    }

    // [Security] Return 1 Digimon from trash + add this to hand.
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Return 1 Digimon card from your trash to your hand, and add this card to your hand.",
          optional: false,
          resolve: async (ctx) => {
            const trash = ctx.game.player(source.ownerSeat).trash;
            const digiTrash = trash.filter((c) => isDigimon(ctx.game.definitionOf(c))).map((c) => c.instanceId);
            if (digiTrash.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates: digiTrash, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.returnToHand(chosen);
              }
            }
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      );
    }

    return out;
  },
};

const compiled = JSON.parse(JSON.stringify(compiledEffects[cardId]!)) as CompiledCard;
const main = compiled.effects.find((effect) => effect.trigger === "Main");
if (main?.actions[0]?.kind === "RawUnparsed") {
  main.actions[0] = {
    kind: "Digivolve",
    target: { filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 6 } }, count: 1 },
    into: { zone: "hand", controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 6 } },
    from: ["hand"],
    payCost: false,
    ignoreRequirements: true,
    optional: true,
  };
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard(cardId, compiled);
export default module;
