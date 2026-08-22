// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const reveal = { kind: "RevealAdd", revealCount: 4, add: [{ filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }, { tokens: ["Etemon"], match: "name" }] }, count: "all", costBudget: 7, to: "play", optional: true }], rest: "trash" };
const compiled: CompiledCard = { effects: [{ trigger: "OnPlay", actions: [reveal] }, { trigger: "WhenDigivolving", actions: [reveal] }], coverage: "full", residual: [] };
registerIrCard("BT11-044", compiled);
