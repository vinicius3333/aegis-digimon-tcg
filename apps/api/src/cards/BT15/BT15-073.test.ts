import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-073.js";
import "../index.js";

describe("BT15-073", () => {
  it("draws one and trashes one hand card when digivolving or on deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }],
    });
    expect(compiled.effects?.some((entry) => entry.trigger === "Main")).toBe(false);
  });
  it("deletes the battled opponent when the inherited effect fires after a battle deletion", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Delete", target: { sourceRef: "battleOpponent" } }],
    });
  });
  it("naturally draws then trashes after a legal Loogamon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-071", as: "base" }],
          hand: [
            { card: "BT15-073", as: "bakemon" },
            { card: "BT1-001", as: "filler" },
          ],
          deck: [{ card: "BT1-002", as: "drawn" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-073");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("filler").instanceId);
  });

  it("naturally draws and trashes when deleted in battle as the top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-073", as: "bakemon", under: ["BT15-071"], suspended: true }],
          hand: [{ card: "BT1-001", as: "filler" }],
          deck: [{ card: "BT1-002", as: "drawn" }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bakemon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("filler").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    // The inherited retaliation clause is inactive while this card is the top card, so the
    // attacker survives its own battle.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("naturally deletes its battle opponent as a digivolution card", async () => {
    const s = setupEngine(
      {
        // BT2-059 is a vanilla host, so the only [On Deletion] reaction in play is the
        // inherited retaliation clause printed on BT15-073 underneath it.
        0: {
          battleArea: [{ card: "BT2-059", as: "host", under: ["BT15-073"], suspended: true }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 9000 }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
  });
});
