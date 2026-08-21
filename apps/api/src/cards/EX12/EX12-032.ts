// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Garurumon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["NSo", "VB"],
      cost: 3,
      isAlternate: true,
    },
  ],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 5 },
        { color: "Purple", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 5 },
        { color: "Red", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 5 },
        { color: "Purple", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 5 },
        { color: "Red", level: 5 },
      ],
    },
  ],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
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
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Garurumon"],
                match: "name",
              },
              {
                tokens: ["NSo", "VB"],
                match: "trait",
              },
            ],
          },
          from: ["trash"],
          payCost: true,
          reduceCost: 2,
          optional: true,
          condition: {
            kind: "stackHasSameLevelCards",
            count: 2,
            raw: "this Digimon's stack has 2 or more same-level cards",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.4 or lower w/[Gabumon]/[Garurumon] in name or w/[NSo]/[VB] trait)＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX12-032", compiled);
