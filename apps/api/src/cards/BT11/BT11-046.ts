// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 4, add: [{ filter: { controllerDefault: "mine", kind: ["Tamer"] }, count: 1, to: "hand" }], rest: "deckBottom" }] },
  { trigger: "YourTurn", actions: [{ kind: "Aura", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] }, raw: "you have a Tamer in play" } }], isInherited: true },
], coverage: "full", residual: [] };
registerIrCard("BT11-046", compiled);
