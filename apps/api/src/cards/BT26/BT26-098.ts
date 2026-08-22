// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const lalamon = { controller: "mine", zone: "battleArea", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Lalamon"], match: "name" }] };
const sunflowmon = { controller: "mine", zone: "trash", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Sunflowmon"], match: "name" }] };
const lilamon = { controller: "mine", zone: "trash", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Lilamon"], match: "name" }] };
const rosemon = { controller: "mine", zone: "hand", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Rosemon"], match: "name" }] };
const aegiochusmon = { controller: "mine", zone: "trash", nameOrTrait: [{ tokens: ["Aegiochusmon"], match: "name" }] };
const securityPlayable = { controller: "mine", zone: ["hand", "trash"], kind: ["Digimon", "Tamer"], orFilters: [
  { nameOrTrait: [{ tokens: ["Lalamon"], match: "name" }] },
  { nameOrTrait: [{ tokens: ["Yoshino Fujieda"], match: "name" }] },
] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [{ kind: "CostModifier", costType: "use", mode: "reduce", amount: 2, target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, handResident: true, cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" }, optional: true, abortOnDecline: true }],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "PlaceUnder", target: { filter: sunflowmon, count: 1 }, destination: { filter: lalamon, count: 1 }, bindHostAs: "lalamonHost", position: "bottom" },
        { kind: "PlaceUnder", target: { filter: lilamon, count: 1 }, underSelectionRef: "lalamonHost", position: "bottom" },
        { kind: "Digivolve", target: { filter: lalamon, count: 1 }, into: { filter: rosemon, count: 1 }, from: ["hand"], payCost: false, ignoreRequirements: true, optional: true },
        { kind: "PlaceUnder", target: { filter: aegiochusmon, count: 1 }, underFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Jupitermon"], match: "name" }] }, position: "top", optional: true, condition: { kind: "ifThisEffectDigivolved" } },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: securityPlayable, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-098", compiled);
