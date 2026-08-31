import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-194.js";

describe("P-194 Aegiomon", () => {
  it("requires a level 3 TS Digimon for evolution", () => {
    expect(runtimeCompiledCard("P-194")!.digivolutionRequirement).toEqual([
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
  });

  it("has Blocker and Barrier, with inherited Barrier preserved", () => {
    const card = runtimeCompiledCard("P-194")!;
    expect(card.effects.filter((effect) => !effect.isInherited).flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Barrier", raw: "＜Barrier＞" },
    ]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
  });

  it("exposes Blocker and Barrier on the live Aegiomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-194", as: "aegio" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("aegio"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("aegio"), "Barrier")).toBe(true);
  });

  it("passes inherited Barrier through a real evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["P-194"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });
});
