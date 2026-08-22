import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-063")!);
const staticEffect = compiled.effects.find((effect) => effect.trigger === "Static");
if (staticEffect !== undefined) {
  staticEffect.actions = [{
    kind: "Aura",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
    while: { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } },
  }];
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard("BT12-063", compiled);
