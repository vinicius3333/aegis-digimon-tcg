// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const appTraits = [{ tokens: ["System", "Life", "Transmutation"], match: "trait" as const }];

export const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-242/start-main-trash-draw-memory",
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "hand", controller: "mine", nameOrTrait: appTraits },
              count: 1,
            },
            raw: "By trashing 1 [System], [Life (App Name)] or [Transmutation (App Name)] trait card from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      effectKey: "P-242/main-suspend-link",
      trigger: "Main",
      actions: [
        {
          kind: "Link",
          target: {
            filter: { zone: "trash", controller: "mine", nameOrTrait: appTraits },
            count: 1,
          },
          recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          from: ["trash"],
          costDelta: -1,
          payCost: true,
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      effectKey: "P-242/security-play-free",
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-242", compiled);
