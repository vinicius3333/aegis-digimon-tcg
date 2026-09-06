import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-13.js";

describe("ST10-13 Junomon", () => {
  it("has Retaliation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST10-13", as: "junomon" }] } }, { autoOrderTriggers: true });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("junomon"), "Retaliation")).toBe(true);
  });

  it("trashes the top 3 deck cards and returns a Digimon from trash when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-12", as: "base" }],
          hand: [{ card: "ST10-13", as: "junomon" }],
          deck: [
            { card: "BT1-001", as: "evolutionDraw" },
            { card: "ST10-07", as: "returned" },
            "ST10-14",
            "ST10-15",
            "BT1-002",
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("junomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "ST10-13" &&
        s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId),
    );
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["ST10-14", "ST10-15"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-002"]);
  });

  it("deletes a stronger battle opponent with Retaliation after losing the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST10-13", as: "junomon" }] },
      1: { battleArea: [{ card: "ST1-10", as: "opponent", suspended: true }], security: ["BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("junomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("ST10-13");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("ST1-10");
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
