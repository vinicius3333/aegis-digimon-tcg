import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-065.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-065", () => {
  it("has Blast Digivolve and Scapegoat and plays a level-four-or-lower DM Digimon from trash on play or digivolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Scapegoat", raw: "＜Scapegoat＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], target: { filter: { levelComparison: { op: "lte", value: 4 } } } });
  });
  it("grants Blocker and Retaliation to all own Ver.4 Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions ?? [];
    expect(actions.find((action) => (action as any).keyword?.keyword === "Blocker")).toBeDefined();
    expect(actions.find((action) => (action as any).keyword?.keyword === "Retaliation")).toBeDefined();
  });
  it("keeps both play triggers optional and restricts their free play to own level-four-or-lower DM Digimon in trash", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true, payCost: false, from: ["trash"], target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["DM"], match: "trait" }] } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toMatchObject([{ target: { count: "all", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.4"], match: "trait" }] } } }, { target: { count: "all", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.4"], match: "trait" }] } } }]);
  });
  it("plays a level-four DM from trash and grants both keywords to own Ver.4 Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-065", as: "source" }, { card: "EX9-035", as: "ver4" }], trash: ["EX9-037"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0].battleArea.some((permanent) => permanent.topCard.cardId === "EX9-037"));
    expect(s.state.players[0].trash.some((card) => card.cardId === "EX9-037")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ver4"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ver4"), "Retaliation")).toBe(true);
  });
});
