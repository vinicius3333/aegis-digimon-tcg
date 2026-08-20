import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-019.js";

describe("EX8-019", () => {
  it("reduces Ice-Snow digivolution cost by 1 during your turn and gains Ice-Snow as a trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "Replacement", actions: [{ mode: "reduceCost", amount: 1 }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Ice-Snow"] });
  });
  it("inherits giving an opposing Digimon Security Attack -1 when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" }));
  it("exposes the Ice-Snow trait on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-019", as: "penguinmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("penguinmon"), "Ice-Snow")).toBe(true);
  });
});
