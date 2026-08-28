import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-106.js";

describe("BT1-106 Symphony No.1 <Polyphony>", () => {
  it("gives exactly 1 opposing Digimon -7000 DP for the turn and then expires", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-047"], hand: [{ card: "BT1-106", as: "option" }], deck: ["BT1-001"] },
        1: { battleArea: [{ card: "BT10-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.phase === Phase.Main);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.perm("target").currentDP).toBe(12_000);
  });

  it("deletes a 7000 DP target when the modifier reduces it to 0 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-047"], hand: [{ card: "BT1-106", as: "option" }] },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-016")).toBe(true);
  });

  it("has no Security effect and is simply trashed after the check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 5000 }] },
      1: { security: [{ card: "BT1-106", as: "securityOption" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
