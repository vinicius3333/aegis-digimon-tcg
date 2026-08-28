import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-022.js";

describe("BT1-022 Garudamon", () => {
  it("has Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-022", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasPierce(s.perm("digimon"))).toBe(true);
  });

  it("deletes a weaker Digimon and then performs its normal security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-022", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true }], security: ["BT1-001"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("draws 1 when its host is blocked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-023", under: ["BT1-022"], as: "attacker", dp: 7000 }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-072", as: "blocker", dp: 6000 }], security: ["BT1-011"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw when its host directly attacks an opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-023", under: ["BT1-022"], as: "attacker", dp: 7000 }],
        deck: [{ card: "BT1-010", as: "top" }],
      },
      1: { battleArea: [{ card: "BT1-016", as: "defender", dp: 5000, suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw from a block event during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-023", under: ["BT1-022"], as: "host" }],
        deck: [{ card: "BT1-010", as: "top" }],
      },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).fireForPermanent(EffectTiming.OnBlockAnyone, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
