import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-114.js";
import "./EX1-047.js";
import "./EX1-048.js";
import "./EX1-049.js";
import "./EX1-050.js";
import "./EX1-073.js";

describe("EX1-073 Machinedramon", () => {
  it("places eligible unique level-5 Cyborgs from hand/trash under itself and gains memory per card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-073", as: "machine" },
            { card: "EX1-008", as: "redCyborg" },
          ],
          trash: [{ card: "EX1-050", as: "blackCyborg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machine").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-073" && p.stack.length === 2) &&
        s.state.memory === 2,
    );
    expect(s.state.memory).toBe(2);
  });

  it("may place no cards on play and therefore gains no memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-073", as: "machine" },
            { card: "EX1-008", as: "cyborg" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: false },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-073"));

    const machine = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX1-073");
    expect(machine?.stack).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("cyborg").instanceId)).toBe(true);
  });

  it("cannot pay deletion prevention with fewer than 2 eligible level-5 sources", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX1-073", as: "machine", under: ["EX1-008"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("machine").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX1-073", "EX1-008"]));
  });

  it("Machine line reuses a Cyborg trashed by Ultimate Connection as Machinedramon material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-069", as: "connection" },
            { card: "EX1-008", as: "costAndMaterial" },
            { card: "EX1-073", as: "machine" },
            { card: "EX1-050", as: "handMaterial" },
          ],
          battleArea: [{ card: "EX1-047", as: "blackSource" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const reusedId = s.inst("costAndMaterial").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("connection").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === reusedId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-073" && p.stack.length === 2),
    );

    const machine = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX1-073")!;
    expect(machine.stack.some((c) => c.instanceId === reusedId)).toBe(true);
    expect(machine.stack.some((c) => c.instanceId === s.inst("handMaterial").instanceId)).toBe(true);
  });

  it("cannot have its DP reduced and prevents deletion by trashing 2 level-5 sources", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX1-073", as: "machine", under: ["EX1-008", "EX1-050"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("machine").currentDP;
    await advance(s.engine).verb.modifyDP(s.perm("machine").permanentId, -3000, EffectDuration.UntilEachTurnEnd);
    expect(s.perm("machine").currentDP).toBe(before);
    await advance(s.engine).verb.deletePermanent([s.perm("machine").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("machine").stack).toHaveLength(0);
  });

  it("trashes prevention cards only from Machinedramon's own stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-073", as: "machine", under: ["EX1-008", "EX1-050"] },
            { card: "EX1-060", as: "otherHost", under: ["EX1-061", "EX1-062"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("machine").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("machine").stack).toHaveLength(0);
    expect(s.perm("otherHost").stack).toHaveLength(2);
  });

  it("combines the historical Cyborg package into one Machinedramon attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-073",
              as: "machine",
              under: ["BT1-114", "EX1-047", "EX1-050"],
            },
          ],
          hand: [{ card: "EX1-049", as: "discardedCyborg" }],
          deck: [
            { card: "EX1-048", as: "firstDraw" },
            { card: "EX1-049", as: "secondDraw" },
          ],
        },
        1: {
          battleArea: [{ card: "EX1-047", as: "smallBlocker" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.perm("machine").currentDP).toBe(14_000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.deck.length === 0 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discardedCyborg").instanceId),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDraw").instanceId, s.inst("secondDraw").instanceId]),
    );
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "Blocker")).toBe(false);
  });

  it("keeps the defensive Cyborg package active after paying one deletion prevention", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-073",
              as: "machine",
              under: ["EX1-048", "EX1-049", "EX1-050", "BT1-114"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("machine"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "Reboot")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("machine").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("machine").stack).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "Reboot")).toBe(false);
  });

  it("caps placement at five unique eligible cards and leaves wrong level/trait cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-073", as: "machine" },
            "EX1-008",
            "EX1-050",
            "BT1-021",
            "BT1-024",
            "BT10-065",
            "BT11-067",
            { card: "EX1-047", as: "wrongLevel" },
            { card: "BT1-020", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machine").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("machine").stack.length === 5);
    expect(s.perm("machine").stack).toHaveLength(5);
    expect(new Set(s.perm("machine").stack.map((card) => card.cardId)).size).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongLevel").instanceId, s.inst("wrongTrait").instanceId]),
    );
  });

  it("can pay deletion prevention again for a separate deletion event (Q6030)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-073",
              as: "machine",
              under: ["EX1-050", "EX1-050", "BT1-020", "BT1-020"],
            },
          ],
          deck: ["BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-084", dp: 15_000, as: "firstAttacker" },
            { card: "BT1-084", dp: 15_000, as: "secondAttacker" },
          ],
          deck: ["BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("machine").isSuspended);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("machine").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("machine").stack.length === 2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("machine").permanentId)).toBe(
      true,
    );

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("machine").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("machine").stack.length === 0);
    expect(s.perm("machine").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("machine").permanentId)).toBe(
      true,
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
