import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5809: Digimon played by On Play/WhenDigivolving effect is deleted at end of turn.
// KB Q5810: end-of-turn effect and the deletion are simultaneous; turn player chooses order.
// Alternate digivolve: Yellow/Purple Lv.4 [Puppet] trait: Cost 3 — baseColors added.
// Inherited [All Turns] Replacement cost: "1 of your Tokens OR other [Puppet] trait Digimon"
//   — or-filter combining isToken:true and Puppet-trait Digimon (excludeSelf handles "other").
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Scapegoat",
          raw: "＜Scapegoat＞",
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
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
              nameOrTrait: [
                {
                  tokens: ["Puppet"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          // "At turn end, delete the Digimon this effect played" (KB Q5809/Q5810). `DelayedDelete`
          // arms the engine's turn-end delete watcher on the permanent the preceding
          // PlayWithoutCost produced (ctx.lastPlayedPermanentIds). It replaces a SubTrigger whose
          // Delete carried the never-read `playedByThisEffect` filter — that filter matched EVERY
          // permanent, so the watcher wiped the board at turn end. documented behavior
          // (AddSelfDeleteEffect on the played permanent).
          kind: "DelayedDelete",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
              nameOrTrait: [
                {
                  tokens: ["Puppet"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          // "At turn end, delete the Digimon this effect played" (KB Q5809/Q5810). `DelayedDelete`
          // arms the engine's turn-end delete watcher on the permanent the preceding
          // PlayWithoutCost produced (ctx.lastPlayedPermanentIds). It replaces a SubTrigger whose
          // Delete carried the never-read `playedByThisEffect` filter — that filter matched EVERY
          // permanent, so the watcher wiped the board at turn end. documented behavior
          // (AddSelfDeleteEffect on the played permanent).
          kind: "DelayedDelete",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                isToken: true,
              },
              orFilters: [
                {
                  controller: "mine",
                  excludeSelf: true,
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
                },
              ],
              count: 1,
            },
            raw: "by deleting 1 of your Tokens or other [Puppet] trait Digimon, it doesn't leave",
          },
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
      traits: ["Puppet"],
      cost: 3,
      isAlternate: true,
      baseColors: ["Yellow", "Purple"],
    },
  ],
};

registerIrCard("EX11-022", compiled);
