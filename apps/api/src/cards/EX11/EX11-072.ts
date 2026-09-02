import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ＜Delay＞ is printed ON the [Your Turn] clause ("When any of your [Shoto Kazama]s suspend,
// ＜Delay＞ ・..."), so it belongs to the interpreter's INTRINSIC Delay model
// (`withIntrinsicDelayGate`, comprehensive rules §16-17): trashing this card is the activation
// cost (§16-17-1), the whole processing is optional (§16-17-2), and it can't be activated the
// turn the card entered the battle area (§16-17-3). A `YourTurn` trigger maps to
// EffectTiming.None, so `irCardModule` routes it through `withIntrinsicDelayGate`, which stamps
// the SubTrigger listener with the trash cost, the turn-guard, and a `canAttemptDigivolve`
// pre-check.
//
// It was previously encoded as the OTHER Delay model — a `GainKeyword(Delay)` grant plus a
// separate `[Main]` payload flagged `requiresDelayArmed` (the P-243/EX5-069 shape, for cards
// whose Delay is granted by a DIFFERENT clause). That model consumes the grant but never trashes
// the source, so the emblem stayed in the battle area and re-armed on every Shoto Kazama
// suspension, and it skipped the turn-guard entirely. BT17-097 documents the mirror-image
// mistake. The extra `[Main]` clause also gave `[Security] Activate this card's [Main] effects`
// a second Main clause it must not reach.
//
// KB Q5944: the card digivolved INTO must carry BOTH [Bird Dragon] AND [LIBERATOR].
// `definitionMatchesFilter` treats a multi-entry `nameOrTrait` array as a UNION, so a
// conjunction has to pair `nameOrTrait` with the separate `traits` predicate, which ANDs with
// it. The previous `match: "traitAll"` is not a mode `matchNameOrTrait` knows: it fell through
// to the final `return`, the "any" branch, which matches name ∪ trait ∪ EFFECT TEXT for EITHER
// token — so any Digimon merely mentioning "LIBERATOR" in its text qualified.
//
// The base filter is a genuine union: "[Avian] or [Bird] in ANY of its traits" (substring, hence
// `traitContains`) OR "the [Vortex Warriors] trait" (exact).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Pteromon", "Muchomon", "Shoto Kazama"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        // "Then, place this card in the battle area." — mandatory, and it runs whether or not
        // the optional play above happened.
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "YourTurn",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Shoto Kazama"],
                match: "nameExact",
              },
            ],
          },
          raw: "Trash this card to activate its ＜Delay＞ effect?",
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    { tokens: ["Avian", "Bird"], match: "traitContains" },
                    { tokens: ["Vortex Warriors"], match: "trait" },
                  ],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Bird Dragon"], match: "trait" }],
                traits: ["LIBERATOR"],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 3,
            },
          ],
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
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-072", compiled);
