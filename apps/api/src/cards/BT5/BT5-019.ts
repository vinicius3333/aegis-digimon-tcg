// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = { effects: [
  { trigger: "WhenDigivolving", keywords: [{ keyword: "Blitz", raw: "＜Blitz＞" }] },
  { trigger: "WhenDigivolving", actions: [
    { kind: "PlaceUnder", target: { filter: { zone: "hand", controller: "mine", kind: ["Digimon"], colors: ["Red"] }, count: 1 }, from: ["hand"], underFilter: { isSelfRef: true }, position: "top", optional: true },
    { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 1 }, optional: true, scaling: { per: 1, filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["OmniShoutmon", "ZeigGreymon"], match: "name" }] }, unit: "digivolutionCards" } },
  ] },
], coverage: "full", residual: [] };
registerIrCard("BT5-019", compiled);
