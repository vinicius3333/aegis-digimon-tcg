import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-005.js";
import "../index.js";
import "../../BT1/BT1-036.js";
import "../../BT5/BT5-062.js";

describe("BT16-005", () => {
  it("once per turn gains memory when another Blocker Digimon is deleted", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { excludeSelf: true, keywords: ["Blocker"] },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));

  it("gains memory from a natural Blocker battle deletion only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-036", as: "garurumon" }],
          battleArea: [{ card: "BT16-010", as: "host", under: ["BT16-005"] }],
        },
        1: {
          battleArea: [
            { card: "BT5-062", as: "firstBlocker", suspended: true },
            { card: "BT5-062", as: "secondBlocker", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const firstBlockerInstanceId = s.perm("firstBlocker").topCard.instanceId;
    const secondBlockerInstanceId = s.perm("secondBlocker").topCard.instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstBlocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstBlockerInstanceId));
    expect(s.state.memory).toBe(11);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended === false);
    const memoryBeforeSecondBattle = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondBlocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === secondBlockerInstanceId));
    expect(s.state.memory).toBe(memoryBeforeSecondBattle);
  });

  it("does not gain memory when its host and the Blocker lose the same battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-010", as: "host", dp: 6000, under: ["BT16-005"] }] },
      1: { battleArea: [{ card: "BT5-062", as: "blocker", dp: 6000, suspended: true }] },
    });
    const hostInstanceIds = s.perm("host").stack.map((card) => card.instanceId).concat(s.perm("host").topCard!.instanceId);
    const blockerInstanceId = s.perm("blocker").topCard.instanceId;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.trash.some((card) => card.instanceId === blockerInstanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(hostInstanceIds));
  });
});
