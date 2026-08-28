import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  coverage: "full",
  residual: [],
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "hand", controller: "mine" }, count: 1, allowZero: true },
          from: ["hand"],
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
          },
          position: "bottom",
          faceDown: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" },
          addedDigivolutionCardFilter: { faceDown: true },
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "GainMemory", amount: 1 },
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 },
            },
          ],
          raw: "When face-down cards are placed as any of your Digimon's digivolution cards",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], digivolutionCards: "hasFaceDown" },
            count: "all",
          },
          keyword: { keyword: "Reboot", raw: "＜Reboot＞" },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
};

registerIrCard("EX9-069", compiled);
export default compiled;
