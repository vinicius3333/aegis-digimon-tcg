import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * BT7-055 — Ebonwumon (BT7, Green Lv.6 Digimon).
 *
 *
 * Printed text (no errata):
 *   [When Digivolving] Suspend 1 of your opponent's Digimon. Then, gain 1 memory for
 *   each of your opponent's suspended Digimon.
 *   [Opponent's Turn] All of your opponent's Digimon gain "[Your Turn] You must trash
 *   1 card in your hand to unsuspend this Digimon."
 *
 * KB Q1596-Q1600: must trash 1 card per Digimon unsuspended; applies to all unsuspend
 * methods; each Ebonwumon in play stacks the requirement.
 *
 * The [Opponent's Turn] effect grants an unsuspend cost to each opponent Digimon. This
 * requires engine-level support for per-permanent unsuspend costs (GrantUnsuspendCost).
 * Modeled here as a static modifier that installs the cost gate; the engine's unsuspend
 * path consults the continuous ledger for active unsuspend-cost requirements.
 */
const compiled: CompiledCard = { effects: [{ trigger: "WhenDigivolving", actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }, { kind: "GainMemory", amount: 1, scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"], suspended: true } } }] }, { trigger: "Static", actions: [{ kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 99 }, restriction: "unsuspendHandTrashCost", duration: "untilOpponentTurnEnd" }] }], coverage: "full", residual: [] };
registerIrCard("BT7-055", compiled);
