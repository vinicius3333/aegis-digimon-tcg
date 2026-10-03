import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const recoveryAndBreedingDigivolve: Pick<CompiledCard["effects"][number], "actions"> = {
  actions: [
    { effectTextPart: "[On Play] [When Digivolving] ＜Recovery +1 (Deck)＞.", kind: "Recover", amount: 1 },
    {
      effectTextPart:
        "Then, if during an attack, 1 of your Digimon in the breeding area may digivolve into a level 6 or lower [Chronicle] trait Digimon card in the hand or trash without paying the cost.",
      kind: "Digivolve",
      target: {
        filter: { zone: "breeding", controller: "mine", kind: ["Digimon"] },
        count: 1,
        targetBreeding: true,
      },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        levelComparison: { op: "lte", value: 6 },
        nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
      },
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      condition: { kind: "duringAttack", raw: "during an attack" },
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    { trigger: "OnPlay", ...recoveryAndBreedingDigivolve },
    { trigger: "WhenDigivolving", ...recoveryAndBreedingDigivolve },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -8000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          leaveCause: "otherThanYourEffect",
          condition: { kind: "selfHasName", names: ["Alphamon: Ouryuken"] },
          cost: { kind: "trashSecurityTop", raw: "by trashing your top security card" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-056", compiled);
