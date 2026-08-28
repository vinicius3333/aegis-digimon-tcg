import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-026.js";

describe("BT2-026 Veedramon", () => {
  it("gains Jamming during its turn while an allied blue Tamer is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(true);
  });

  it("does not gain Jamming from a non-blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(false);
  });

  it("does not have Jamming during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(false);
  });

  it("survives battle against a higher-DP Security Digimon while Jamming is active", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-086", as: "tamer" },
        ],
      },
      1: { security: ["BT1-080"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("veedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("veedramon").permanentId),
    ).toBe(true);
  });

  it("is deleted by a higher-DP Security Digimon without a blue Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-026", as: "veedramon" }] },
      1: { security: ["BT1-080"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("veedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-026")).toBe(true);
  });
});
