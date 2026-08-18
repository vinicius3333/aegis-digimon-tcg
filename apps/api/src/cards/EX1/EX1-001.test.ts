import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-001.js";

describe("EX1-001 Agumon", () => {
  it("reveals 3 on attack and adds exactly 1 Tamer or Agumon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", under: ["EX1-001"] }],
          deck: [
            { card: "ST1-12", as: "validTamer" },
            { card: "BT1-009", as: "validAgumon" },
            { card: "BT1-010", as: "invalid" },
            { card: "BT1-011", as: "untouched" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => p0.hand.length === 1);

    expect(["ST1-12", "BT1-009"]).toContain(p0.hand[0]!.cardId);
    expect(p0.deck).toHaveLength(3);
    expect(p0.deck.some((card) => card.cardId === "BT1-011")).toBe(true);
  });
});
