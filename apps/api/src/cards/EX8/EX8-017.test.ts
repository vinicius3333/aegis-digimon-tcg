import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX8-017.js";

describe("EX8-017", () => {
  it("gives one of your Digimon Blocker until the end of the opponent's turn on play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      duration: "untilOpponentTurnEnd",
      target: { count: 1 },
    }));
  it("inherits Jamming", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Jamming",
      raw: "＜Jamming＞",
    }));
  it("gives a live friendly Digimon Blocker on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX8-017", as: "crabmon" }], battleArea: [{ card: "AD1-001", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
  });
  it("exposes inherited Jamming on a live host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-017", as: "crabmon" }] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
