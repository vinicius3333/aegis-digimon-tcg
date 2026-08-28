import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-005 Gammamon", () => {
  it("adds Hiro from the revealed cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "RB1-005", as: "gammamon" }], deck: ["RB1-032", "BT1-009", "BT1-014"] } },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gammamon"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-032")).toBe(true);
  });

  it("grants inherited DP only when the top card has Gammamon in its text", async () => {
    const positive = setupEngine({
      0: { battleArea: [{ card: "RB1-008", as: "host", under: [{ card: "RB1-005" }] }] },
    });
    await positive.ready();
    expect(positive.perm("host").currentDP).toBe(8000);

    const negative = setupEngine({
      0: { battleArea: [{ card: "RB1-024", as: "host", under: [{ card: "RB1-005" }] }] },
    });
    await negative.ready();
    expect(negative.perm("host").currentDP).toBe(8000);
  });
});
