import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-011 Jellymon", () => {
  it("adds Kiyoshiro when it is the matching Jellymon-text reveal", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "RB1-011", as: "jellymon" }], deck: ["RB1-033", "BT1-009", "BT1-014"] } },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jellymon"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-033")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("returns all unmatched reveals to the bottom without adding cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "RB1-011", as: "jellymon" }], deck: ["BT1-009", "BT1-014", "BT1-015"] } },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jellymon"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
