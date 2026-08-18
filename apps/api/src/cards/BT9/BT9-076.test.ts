import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT3/BT3-014.js";
import "./BT9-076.js";
import "./BT9-091.js";

describe("BT9-076 Maycrackmon: Vicious Mode", () => {
  it("deletes a level 3 Digimon when a purple card is trashed", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { hand: [{ card: "BT9-076", as: "source" }, { card: "BT9-070", as: "discard" }] }, 1: {
      battleArea: [{ card: "BT9-008", as: "target" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred, autoOrderTriggers: true });
    const opponent = s.state.players[1] as PlayerState;
    preferred.push(s.inst("discard").instanceId);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0);
    expect(opponent.battleArea).toHaveLength(0);
  });

  it("applies both branches when the discarded card is purple and yellow", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-091", as: "meiko" }],
        hand: [
          { card: "BT9-076", as: "source" },
          { card: "BT9-074", as: "dualDiscard" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT9-008", as: "level3" },
          { card: "BT9-014", as: "dpTarget" },
        ],
      },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      preferInstanceIds: preferred,
    });
    preferred.push(
      s.inst("dualDiscard").instanceId,
      s.perm("level3").permanentId,
      s.perm("dpTarget").permanentId,
    );
    const level3Id = s.perm("level3").permanentId;
    const dpTarget = s.perm("dpTarget");
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3Id) &&
      dpTarget.currentDP === 5000 &&
      s.perm("meiko").isSuspended &&
      s.state.memory === 1,
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("dualDiscard").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3Id)).toBe(false);
    expect(dpTarget.currentDP).toBe(5000);
    expect(s.perm("meiko").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("runs the yellow branch when digivolving and leaves level 3 Digimon undeleted", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-074", as: "base" }],
        hand: [
          { card: "BT9-076", as: "evolving" },
          { card: "BT4-041", as: "yellowDiscard" },
        ],
      },
      1: { battleArea: [{ card: "BT9-008", as: "target", dp: 5000 }] },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      preferInstanceIds: preferred,
    });
    preferred.push(s.inst("yellowDiscard").instanceId, s.perm("target").permanentId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    const target = s.perm("target");
    await settle(() => target.currentDP === 2000);

    expect(s.state.players[1]!.battleArea).toContain(target);
    expect(target.currentDP).toBe(2000);
  });

  it("does nothing after the controller declines to trash a hand card", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT9-076", as: "source" }, { card: "BT9-074", as: "kept" }],
      },
      1: { battleArea: [{ card: "BT9-008", as: "target", dp: 5000 }] },
    }, {
      autoDeclineOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    const target = s.perm("target");
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT9-076"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kept").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toContain(target);
    expect(target.currentDP).toBe(5000);
  });

  it("its inherited On Deletion gives 2 memory to its controller on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-080", as: "host", under: [{ card: "BT9-076", as: "source" }] }] },
    }, { autoOrderTriggers: true });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const hostId = s.perm("host").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(1);
    await settle(() => s.state.memory === -2);

    expect(s.state.memory).toBe(-2);
  });

  it("its inherited On Deletion does not gain memory from a single-color host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: [{ card: "BT9-076", as: "source" }] }] },
    }, { autoOrderTriggers: true });
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId])).toBe(1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId));

    expect(s.state.memory).toBe(0);
  });

  it("its inherited On Deletion counts a color granted to the host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-014", as: "host", under: [{ card: "BT9-076", as: "source" }] }] },
    }, { autoOrderTriggers: true });
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId])).toBe(1);
    await settle(() => s.state.memory === 2);

    expect(s.state.memory).toBe(2);
  });
});
