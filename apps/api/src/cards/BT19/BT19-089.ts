// @ts-nocheck
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ownDigimon = { controller: "mine", kind: ["Digimon"] };
const compiled = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", colors: ["White"], kind: ["Digimon", "Tamer"] },
            raw: "your opponent has a white Digimon or Tamer",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: { filter: ownDigimon, count: 1 },
          restriction: "beAffected",
          fromSourceKind: ["Option"],
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: { filter: ownDigimon, count: 1, sameTarget: true },
          restriction: "dpImmune",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "AddToHandSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-089", compiled);
