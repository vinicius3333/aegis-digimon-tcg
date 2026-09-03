import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          raw: "When an effect places a Tamer card in one of your Digimon's digivolution cards, by suspending this Tamer, gain 1 memory",
          // Every legal placement of a Tamer under a Digimon is effect-driven; the public
          // Mind Link activation does not currently carry the optional byEffect provenance
          // bit into the onAddDigivolutionCards payload.
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      condition: { kind: "selfIsSuspended", raw: "this Tamer is suspended" },
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], digivolutionStackKind: ["Tamer"] },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }],
          },
          payCost: false,
          from: ["trash"],
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-090", compiled);
