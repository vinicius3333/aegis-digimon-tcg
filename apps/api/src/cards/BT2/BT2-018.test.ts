import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-018.js";

describe("BT2-018 Volcanicdramon", () => {
  it("deletes all opposing Digimon with 4000 DP or less", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-018", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-029", as: "smallA", dp: 2000 },
            { card: "BT1-070", as: "smallB", dp: 4000 },
            { card: "BT1-074", as: "large", dp: 4001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 1);
    expect(opponent.battleArea[0]?.permanentId).toBe(s.perm("large").permanentId);
    expect(opponent.trash).toHaveLength(2);
  });

  it("has Security Attack +1 and performs 2 security checks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-018", as: "volcanicdramon" }] },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("volcanicdramon"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("volcanicdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("does not activate the On Play deletion when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-016", as: "base" }],
          hand: [{ card: "BT2-018", as: "evolving" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-029", as: "small", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-018");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
