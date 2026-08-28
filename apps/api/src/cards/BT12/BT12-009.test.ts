import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-009.js";

describe("BT12-009 Flamemon", () => {
  it("may trash exactly one Hybrid Digimon from hand to draw 2 on public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT12-009", as: "flamemon" },
            { card: "BT12-012", as: "hybrid" },
            { card: "BT1-009", as: "plain" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flamemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("hybrid").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("plain").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(3);
  });

  it("can decline the Hybrid cost without trashing or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-009", as: "flamemon" }, { card: "BT12-012", as: "hybrid" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flamemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("hybrid").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("does not draw when no Hybrid Digimon can pay the cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT12-009", as: "flamemon" }, { card: "BT1-009", as: "plain" }], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flamemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("plain").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("gives a Hybrid host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-012", as: "host", under: ["BT12-009"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("gives a Ten Warriors host +2000 DP and excludes an unrelated host", async () => {
    const tenWarriors = setupEngine({ 0: { battleArea: [{ card: "BT12-032", as: "host", under: ["BT12-009"] }] } });
    await tenWarriors.engine.recomputeContinuousEffects();
    expect(tenWarriors.perm("host").currentDP).toBe(15000);

    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-009"] }] } });
    await plain.engine.recomputeContinuousEffects();
    expect(plain.perm("host").currentDP).toBe(3000);
  });
});
