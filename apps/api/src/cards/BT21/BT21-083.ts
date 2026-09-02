import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT21-083";
const qualifyingDigimon = {
  controller: "mine" as const,
  kind: ["Digimon" as const],
  nameOrTrait: [{ tokens: ["Xros Heart", "Hero"], match: "trait" as const }],
};
const attackOnArrival = (event: "whenPlayed" | "whenOneOfYoursDigivolves") => ({
  kind: "SubTrigger" as const,
  event,
  raw: "When your [Xros Heart] or [Hero] Digimon is played or digivolves",
  sourceFilter: qualifyingDigimon,
  actions: [
    {
      kind: "Attack" as const,
      target: { filter: {}, count: 1, sourceRef: "triggerSubject" as const },
      withoutSuspending: false,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "suspend" as const,
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        raw: "by suspending this Tamer",
      },
    },
  ],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare", "Hero"], match: "trait" }],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 qualifying Digimon card from your hand under this Tamer",
          },
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [attackOnArrival("whenPlayed"), attackOnArrival("whenOneOfYoursDigivolves")],
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
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
