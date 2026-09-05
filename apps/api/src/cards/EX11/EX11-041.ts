import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 4, traits: ["Cyborg", "Machine"], cost: 3, isAlternate: true }],
  effects: [
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipUp",
          controller: "opponent",
          amount: 1,
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
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
            nameOrTrait: [
              {
                tokens: ["Invisimon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's their turn",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipUp",
          controller: "opponent",
          amount: 1,
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
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
            nameOrTrait: [
              {
                tokens: ["Invisimon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's their turn",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          sourceFilter: { controllerDefault: "mine" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              // "this Digimon's top stacked card" is the permanent's OWN top card, not its top
              // digivolution card (KB EX11-043 Q5875: with only a Tamer underneath, placing it
              // leaves a Tamer permanent; Q5888: the promoted digivolution card performs the
              // next security check). `detachPermanentTop` sheds only that top card and promotes
              // the stack; without it addSecurity moves the whole permanent and trashes the stack.
              source: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              detachPermanentTop: true,
              faceUp: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "attackTargetChange",
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-041", compiled);
