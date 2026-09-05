import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for EX11-045.
// Fix vs auto-generated: the inherited [All Turns] Delete needs a SubTrigger with
// event "whenEffectAddsDigivolution" (see BT22-027) — the compiler doesn't yet parse
// "When effects add to this Digimon's digivolution cards" as a trigger condition, so
// the generator drops it and the Delete fires on every All Turns trigger instead.
const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true }],
  effects: [
    {
      // Printed ＜Blocker＞ belongs on the keyword line — the shape registration reads for
      // printed-keyword metadata (peers EX11-035 / EX11-073) — not a self-targeted GainKeyword.
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
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
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
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
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
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
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Green"],
            nameOrTrait: [
              {
                tokens: ["Maquinamon"],
                match: "text",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "lowestPlayCost",
                },
                count: 1,
              },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { kinds: ["Digimon"], colors: ["Black"], nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }], count: 5 },
      ],
    },
  ],
};

registerIrCard("EX11-045", compiled);
