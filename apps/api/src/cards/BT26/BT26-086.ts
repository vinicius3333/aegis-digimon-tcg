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
    effectTextPart:
      "[On Play] [When Digivolving] You may link up to 7 [Appmon] trait cards with different names from this Digimon's digivolution cards to this Digimon without paying the costs.",
    kind: "Link",
    target: { filter: appmonStack, count: 7, upTo: true, distinctNames: true },
    differentNames: true,
    recipient: self,
    from: ["digivolutionCards"],
    payCost: false,
    optional: true,
  },
  {
    effectTextPart: "Then, this Digimon may attack without suspending.",
    kind: "Attack",
    target: self,
    withoutSuspending: true,
    optional: true,
  },
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
              effectTextPart:
                "[All Turns] [Once Per Turn] When this Digimon gets linked, you may delete 1 of your opponent's Digimon.",
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
            {
              effectTextPart:
                "Then, if this Digimon has 7 link cards, return your opponent's top security card to the bottom of the deck.",
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
