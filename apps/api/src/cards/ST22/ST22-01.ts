// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for ST22-01 (Viximon).
// Inherited effect: "when you use an [Onmyōjutsu] or [Plug-In] trait Option card,
//   you may digivolve this Digimon into [Kyubimon]/[Taomon]/[Sakuyamon] for a cost
//   reduced by 3."
// Trigger: SubTrigger on whenOptionUsed, not YourTurn free-fire.
// KB Q5407: activates after the used Option card's [Main] effect resolves.
// KB Q5408: does NOT trigger if an Option's effect activates via [Security] or <Delay>.
// The fireCondition matches the Option that drove the whenOptionUsed event.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: {
            kind: "triggerSubjectMatchesFilter",
            filter: {
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
            },
            raw: "when you use an [Onmyōjutsu] or [Plug-In] trait Option card",
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Kyubimon", "Taomon", "Sakuyamon"],
                    match: "name",
                  },
                ],
              },
              payCost: true,
              costDelta: -3,
              from: ["hand"],
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "partial",
  residual: [
    "whenOptionUsed fireCondition for [Onmyōjutsu]/[Plug-In] trait check is raw; no triggerOptionHasTrait condition kind yet",
  ],
};

registerIrCard("ST22-01", compiled);
