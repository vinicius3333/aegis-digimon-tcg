import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-002 Puyoyomon", () => {
  it("trashes the bottom card under an opponent Digimon by paying a blue hand card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-002" }] }], hand: ["RB1-011"] },
        1: { battleArea: [{ card: "RB1-024", as: "target", under: ["RB1-017", "RB1-020"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "RB1-011")).toBe(true);
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("does not activate when no blue payment card is in hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-002" }] }] },
        1: { battleArea: [{ card: "RB1-024", as: "target", under: ["RB1-017"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").stack).toHaveLength(1);
  });
});
