import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-077 (Proximamon).
// [On Play][When Digivolving][When Attacking][Counter] PlayWithoutCost:
//   Added playCost ≤ 10 restriction to all 4 effects (text: "play or use cost 10
//   or lower card"). Each effect also applies to Option cards ("play or use"), so
//   the filter names Digimon, Tamer AND Option: a kind-less filter no longer reaches
//   Options at all, because "play" alone never does (`playableCandidates`).
//   `hostFilter` scopes the digivolution-card pool to the controller's battle-area DIGIMON.
//   This is deliberately NOT `hostFilter: { isSelfRef: true }` — unlike a ＜Decode＞
//   replacement (CR 16-36-1, EX12-014), the printed text reads "from ANY of your Digimon's
//   digivolution cards", so every stack the controller owns is in scope.
// [On Play][When Digivolving] Delete cost: the placement pool must not be restricted to
//   Digimon cards; see the comment on the cost target.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
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
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                // Printed text is "2 CARDS with [Gammamon] in their texts or the [VB] trait",
                // not "2 Digimon cards". A `kind: ["Digimon"]` gate here dropped every
                // qualifying Tamer and Option (EX12-073 Giant Meat carries [VB]) from the
                // payable pool. The HOST restriction lives on `underFilter` below.
                nameOrTrait: [
                  {
                    tokens: ["Gammamon"],
                    match: "text",
                  },
                  {
                    tokens: ["VB"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "choice",
            host: "target",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            raw: "By placing 2 cards with [Gammamon] in their texts or the [VB] trait from your hand or trash as 1 of your Digimon's top or bottom digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                // Printed text is "2 CARDS with [Gammamon] in their texts or the [VB] trait",
                // not "2 Digimon cards". A `kind: ["Digimon"]` gate here dropped every
                // qualifying Tamer and Option (EX12-073 Giant Meat carries [VB]) from the
                // payable pool. The HOST restriction lives on `underFilter` below.
                nameOrTrait: [
                  {
                    tokens: ["Gammamon"],
                    match: "text",
                  },
                  {
                    tokens: ["VB"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "choice",
            host: "target",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            raw: "By placing 2 cards with [Gammamon] in their texts or the [VB] trait from your hand or trash as 1 of your Digimon's top or bottom digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              // "play or use": Digimon and Tamers are played, Options are used. Naming all
              // three keeps every kind in the pool; the play/use split then routes each one.
              kind: ["Digimon", "Tamer", "Option"],
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
              // "from any of YOUR DIGIMON's digivolution cards": the loose `digivolutionCards`
              // zone also yields cards stacked under the controller's Tamers and under the
              // BREEDING-area Digimon, neither of which is "your Digimon". Scope the host.
              hostFilter: { kind: ["Digimon"], zone: "battleArea" },
              playCostLte: 10,
            },
            count: 1,
          },
          from: ["digivolutionCards"],
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              // "play or use": Digimon and Tamers are played, Options are used. Naming all
              // three keeps every kind in the pool; the play/use split then routes each one.
              kind: ["Digimon", "Tamer", "Option"],
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
              // "from any of YOUR DIGIMON's digivolution cards": the loose `digivolutionCards`
              // zone also yields cards stacked under the controller's Tamers and under the
              // BREEDING-area Digimon, neither of which is "your Digimon". Scope the host.
              hostFilter: { kind: ["Digimon"], zone: "battleArea" },
              playCostLte: 10,
            },
            count: 1,
          },
          from: ["digivolutionCards"],
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              // "play or use": Digimon and Tamers are played, Options are used. Naming all
              // three keeps every kind in the pool; the play/use split then routes each one.
              kind: ["Digimon", "Tamer", "Option"],
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
              // "from any of YOUR DIGIMON's digivolution cards": the loose `digivolutionCards`
              // zone also yields cards stacked under the controller's Tamers and under the
              // BREEDING-area Digimon, neither of which is "your Digimon". Scope the host.
              hostFilter: { kind: ["Digimon"], zone: "battleArea" },
              playCostLte: 10,
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "Counter",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              // "play or use": Digimon and Tamers are played, Options are used. Naming all
              // three keeps every kind in the pool; the play/use split then routes each one.
              kind: ["Digimon", "Tamer", "Option"],
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
              // "from any of YOUR DIGIMON's digivolution cards": the loose `digivolutionCards`
              // zone also yields cards stacked under the controller's Tamers and under the
              // BREEDING-area Digimon, neither of which is "your Digimon". Scope the host.
              hostFilter: { kind: ["Digimon"], zone: "battleArea" },
              playCostLte: 10,
            },
            count: 1,
          },
          from: ["digivolutionCards"],
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
      level: 6,
      texts: ["Gammamon"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 6,
      traits: ["VB"],
      cost: 5,
      isAlternate: true,
    },
  ],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          color: "Red",
          level: 6,
        },
        {
          color: "Black",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Red",
          level: 6,
        },
        {
          color: "Purple",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Blue",
          level: 6,
        },
        {
          color: "Black",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Blue",
          level: 6,
        },
        {
          color: "Purple",
          level: 6,
        },
      ],
    },
  ],
};

registerIrCard("EX12-077", compiled);

export { compiled };
