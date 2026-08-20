import { EffectDuration, EffectTiming, type CompiledCard } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      isLinked: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Collision", raw: "＜Collision＞" },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a card w/[TS] trait",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              zone: ["battleArea", "breedingArea"],
              kind: ["Digimon"],
            },
            count: 1,
          },
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

const baseModule = irCardModule("BT25-100", compiled);
const module: EffectModule = {
  cardId: "BT25-100",
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.None) return effects;
    for (const keyword of ["Collision", "Piercing"] as const) {
      effects.push(
        staticModifier({
          source,
          effectKey: `BT25-100/link-${keyword.toLowerCase()}`,
          description: `[Link] ＜${keyword}＞`,
          optional: false,
          isLinked: true,
          when: () => source.permanent() !== undefined,
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, keyword, EffectDuration.UntilEachTurnEnd);
          },
        }),
      );
    }
    return effects;
  },
};

registerCard(module);
export default module;
