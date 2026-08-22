import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-048")!);
const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
if (onPlay !== undefined) onPlay.actions = [
  {
    kind: "Return",
    target: { filter: { zone: "hand", controller: "mine", kind: ["Tamer"] }, count: 3, upTo: true },
    from: ["hand"],
    to: "deckBottom",
    order: "any",
    trackCount: "bt12_048_tamers",
    optional: true,
  },
  {
    kind: "Draw",
    controller: "mine",
    amount: 1,
    scaling: { per: 1, unit: "namedCount", countSource: "bt12_048_tamers" },
  },
];

registerIrCard("BT12-048", compiled);

export default compiled;
