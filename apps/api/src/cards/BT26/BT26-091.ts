// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const dataSquad = { nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] };
const digivolveInto = {
  orFilters: [
    { nameOrTrait: [{ tokens: ["Vegetation"], match: "trait" }] },
    { nameOrTrait: [{ tokens: ["Fairy"], match: "trait" }] },
    dataSquad,
  ],
  kind: ["Digimon"],
};
const reactiveDigivolve = {
  kind: "Digivolve",
  target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
  into: { filter: { controller: "mine", zone: "hand", ...digivolveInto }, count: 1 },
  from: ["hand"],
  payCost: true,
  costDelta: -1,
  optional: true,
  cost: { kind: "suspend", target: self },
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [
      { kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "hand", ...dataSquad }, count: 1 }, underFilter: self.filter, faceDown: true },
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ] },
    { trigger: "YourTurn", actions: [
      { kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, actions: [reactiveDigivolve], raw: "When any of your opponent's Digimon or Tamers suspend, by suspending this Tamer, 1 of your Digimon may digivolve into a Vegetation, Fairy, or DATA SQUAD Digimon from hand with cost reduced by 1." },
      { kind: "SubTrigger", event: "whenDigivolutionTrashed", sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true }, hostFilter: { isSelfRef: true }, actions: [reactiveDigivolve], raw: "When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your Digimon may digivolve into a Vegetation, Fairy, or DATA SQUAD Digimon from hand with cost reduced by 1." },
    ] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-091", compiled);
