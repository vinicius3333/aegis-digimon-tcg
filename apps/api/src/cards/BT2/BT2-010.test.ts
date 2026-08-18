import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-010.js";

describe("BT2-010 Biyomon", () => {
  it("gains 1 memory when deleted by an effect on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-010", as: "bird" }] } });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("bird").permanentId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-010")).toBe(true);
  });

  it("gains 1 memory when deleted in battle on its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-010", as: "bird" }] },
      1: { battleArea: [{ card: "BT2-011", as: "target", dp: 3000, suspended: true }] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bird").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.memory === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does not gain memory when deleted during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-010", as: "bird" }] } });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("bird").permanentId]);
    expect(s.state.memory).toBe(0);
  });
});
