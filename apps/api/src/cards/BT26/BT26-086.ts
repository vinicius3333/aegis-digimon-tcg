import type { Action, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const appmonStack: Filter = {
  controller: "mine",
  zone: "digivolutionCards",
  hasLinkRequirement: true,
  hostFilter: { isSelfRef: true },
  nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
};

const linkThenAttack: Action[] = [
  {
    kind: "Link",
    target: { filter: appmonStack, count: 7, upTo: true, distinctNames: true },
    differentNames: true,
    recipient: self,
    from: ["digivolutionCards"],
    payCost: false,
    optional: true,
  },
  { kind: "Attack", target: self, withoutSuspending: true, optional: true },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Rush", raw: "＜Rush＞" },
        { keyword: "Reboot", raw: "＜Reboot＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Link", amount: 6, raw: "＜Link +6＞" },
      ],
    },
    { trigger: "OnPlay", actions: linkThenAttack },
    { trigger: "WhenDigivolving", actions: linkThenAttack },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
            {
              kind: "Return",
              target: { filter: { controller: "opponent", zone: "security", position: "top" }, count: 1 },
              to: "deckBottom",
              condition: { kind: "selfLinkCountAtLeast", value: 7, raw: "if this Digimon has 7 link cards" },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    { reduceCost: 7, materials: [{ kinds: ["Digimon"], traits: ["Seven Code"], count: 7, differentNames: true }] },
  ],
};

registerIrCard("BT26-086", compiled);
export default compiled;
