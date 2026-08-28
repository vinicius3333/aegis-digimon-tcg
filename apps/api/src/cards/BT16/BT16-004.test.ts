import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-004.js";
import "../index.js";
import "../../BT1/BT1-036.js";

describe("BT16-004", () => {
  it("once per turn gains memory when it deletes in battle and has two colors", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "selfColorCount", value: 2 } }],
        },
      ],
    }));

  it("gains memory from a natural battle deletion and only once before a production unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-036", as: "garurumon" }],
          battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-004"] }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget", dp: 1000 },
            { card: "BT1-010", as: "secondTarget", dp: 1000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const firstTargetInstanceId = s.perm("firstTarget").topCard.instanceId;
    const secondTargetInstanceId = s.perm("secondTarget").topCard.instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstTargetInstanceId));
    expect(s.state.memory).toBe(11);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended === false);
    const memoryBeforeSecondBattle = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === secondTargetInstanceId));
    expect(s.state.memory).toBe(memoryBeforeSecondBattle);
  });

  it("does not gain memory when a one-color host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT16-004"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 1000 }] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
  });
});
