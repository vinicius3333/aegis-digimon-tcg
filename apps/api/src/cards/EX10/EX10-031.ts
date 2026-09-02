import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX10-031 DarkKnightmon
// Text: [On Play] [When Digivolving] Until your opponent's turn ends, their <De-Digivolve>
// effects don't affect 1 of your Digimon, and it gets +3000 DP.
// Text: [All Turns] [Once Per Turn] When this Digimon would leave the battle area, you may
// play 1 play cost 4 or lower card from its digivolution cards without paying the cost.
// Text: [DigiXros -1] [SkullKnightmon] x [DeadlyAxemon]
// KB Q5090: "w/[Knightmon] in text" includes any card with Knightmon in name/traits/effects.
// Fixes: added the <De-Digivolve> protection; added DeadlyAxemon to DigiXros materials;
// added kind filter to PlayWithoutCost target.
// Audit fix (EX10 card-by-card): the protection and the +3000 DP are ONE selected Digimon. The
// previous shape bound the choice with `GrantStatic.selectionRef` and read it back with an
// action-level `ModifyDP.fromSelectionRef` — neither key is read by the interpreter (`selectionRef`
// appears nowhere in grantStatic.ts; `fromSelectionRef` lives on `Target`, not on the action), so
// the DP buff ran a SECOND independent selection and could land on a different Digimon. Rebuilt on
// the SelectBind + `Target.fromSelectionRef` pair the same set's EX10-029 already proves, which is
// also the only typed encoding. `byOpponentEffectsOnly` records the printed "THEIR <De-Digivolve>
// effects"; the de-digivolve site (primitives.ts deDigivolve) currently reads the restriction
// without passing `byOpponentEffect`, so it over-blocks the controller's own <De-Digivolve> too.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "protected",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "protected",
          },
          restriction: "cantBeDeDigivolved",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "protected",
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "protected",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "protected",
          },
          restriction: "cantBeDeDigivolved",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "protected",
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon", "Tamer", "Option"],
                  playCostLte: 4,
                  // "from ITS digivolution cards": scope the pool to this Digimon's own stack.
                  // Without a host gate the loose-card search offers every controlled Digimon's
                  // stack (targeting/loose.ts only self-scopes on an explicit hostFilter).
                  hostFilter: { isSelfRef: true },
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
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
  digivolutionRequirement: [
    {
      level: 4,
      texts: ["Knightmon"],
      cost: 4,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["SkullKnightmon"],
        },
        {
          names: ["DeadlyAxemon"],
        },
      ],
      count: 1,
    },
  ],
};

export { compiled };

registerIrCard("EX10-031", compiled);
