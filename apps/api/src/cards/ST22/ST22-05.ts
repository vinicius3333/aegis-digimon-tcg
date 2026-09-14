import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 [Pipe Fox] Token. (Digimon/Yellow/6000 DP/＜Blocker＞)",
          kind: "PlayToken",
          tokens: ["Pipe Fox"],
          count: 1,
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may use 1 Option card with the [Onmyōjutsu] or [Plug-In] trait from your hand or under your Tamers without paying the cost.",
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            nameOrTrait: [
              { tokens: ["Onmyōjutsu"], match: "trait" },
              { tokens: ["Plug-In"], match: "trait" },
            ],
            controller: "mine",
          },
          from: ["hand", "underTamers"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 [Pipe Fox] Token. (Digimon/Yellow/6000 DP/＜Blocker＞)",
          kind: "PlayToken",
          tokens: ["Pipe Fox"],
          count: 1,
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may use 1 Option card with the [Onmyōjutsu] or [Plug-In] trait from your hand or under your Tamers without paying the cost.",
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            nameOrTrait: [
              { tokens: ["Onmyōjutsu"], match: "trait" },
              { tokens: ["Plug-In"], match: "trait" },
            ],
            controller: "mine",
          },
          from: ["hand", "underTamers"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 [Pipe Fox] Token. (Digimon/Yellow/6000 DP/＜Blocker＞)",
          kind: "PlayToken",
          tokens: ["Pipe Fox"],
          count: 1,
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may use 1 Option card with the [Onmyōjutsu] or [Plug-In] trait from your hand or under your Tamers without paying the cost.",
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            nameOrTrait: [
              { tokens: ["Onmyōjutsu"], match: "trait" },
              { tokens: ["Plug-In"], match: "trait" },
            ],
            controller: "mine",
          },
          from: ["hand", "underTamers"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Sakuyamon: Maid Mode"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST22-05", compiled);
