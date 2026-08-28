import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-048")!);
const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
if (onPlay !== undefined) {
  onPlay.actions = [
    {
      kind: "Return",
      target: { filter: { zone: "hand", controller: "mine", kind: ["Tamer"] }, count: 3, upTo: true },
      from: ["hand"],
      to: "deckBottom",
      order: "any",
      optional: true,
      trackCount: "BT12-048/returned-tamers",
    },
    {
      kind: "Draw",
      controller: "mine",
      amount: 1,
      scaling: { per: 1, unit: "namedCount", countSource: "BT12-048/returned-tamers" },
    },
  ];
}
const inherited = compiled.effects.find((effect) => effect.trigger === "YourTurn" && effect.isInherited === true);
const aura = inherited?.actions.find((action) => action.kind === "Aura");
if (aura?.kind === "Aura") {
  aura.while = {
    kind: "selfTopHasText",
    filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  };
}

const module = registerIrCard("BT12-048", compiled);

export default module;
