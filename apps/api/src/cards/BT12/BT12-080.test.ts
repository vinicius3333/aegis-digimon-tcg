import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-080.js";

describe("BT12-080 Wisemon", () => {
  it("reveals and adds a black or purple Digimon when played", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT12-080", as: "wise" }], deck: ["BT12-071", "BT1-009", "BT1-085"] } },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wise").instanceId })).toEqual({ ok: true });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-071");
  });

  it("reveals and adds a black or purple Digimon when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-080", as: "wise" }], deck: ["BT12-071", "BT1-009", "BT1-085"] } },
      { autoSelectCards: true, autoChooseOption: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wise"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-071");
  });

  it("gives its host Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT12-080"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
