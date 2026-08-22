// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const chronomon = { controller: "mine", kind: ["Digimon"], level: 6, nameOrTrait: [{ tokens: ["Chronomon"], match: "name" }] };

export const compiled: CompiledCard = {
  keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" }, { keyword: "Reboot", raw: "＜Reboot＞" }, { keyword: "Blocker", raw: "＜Blocker＞" }, { keyword: "Succession", raw: "＜Succession (Lv.6 w/[Chronomon] in name)＞" }],
  effects: [
    { trigger: "OnPlay", actions: [{ kind: "RawUnparsed", text: "Return the top 5 stacked cards of 3 of your opponent's Digimon to the top of the deck, with the controller choosing order." }] },
    { trigger: "WhenDigivolving", actions: [{ kind: "RawUnparsed", text: "Return the top 5 stacked cards of 3 of your opponent's Digimon to the top of the deck, with the controller choosing order." }] },
    { trigger: "Static", actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "effects", filter: chronomon, duration: "permanent" }] },
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToDeck", effectSourceFilter: { controller: "mine" }, oncePerTurnKey: "BT26-060/delete-on-effect-adds-to-deck", actions: [{ kind: "Delete", target: { filter: opponentDigimon, count: 1 }, optional: true }], raw: "When your effect adds cards to decks, you may delete 1 of your opponent's Digimon." }] },
  ],
  coverage: "partial",
  residual: ["The per-target top-five stacked-card return across three opponent Digimon and chosen deck order has no executable multi-permanent IR action; both printed return clauses remain loud RawUnparsed."],
  digivolutionRequirement: [{ level: 6, names: ["Chronomon", "Giant Slayer"], cost: 5, isAlternate: true }],
};

registerIrCard("BT26-060", compiled);
