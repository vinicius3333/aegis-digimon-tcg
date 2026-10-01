import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-005.js";
import "../index.js";
import "../BT1/BT1-036.js";
import "../BT5/BT5-062.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-031.js";
import "../BT12/BT12-049.js";
import "../EX8/EX8-051.js";

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
    s.state.memory = 9;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstBlocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstBlockerInstanceId));
    expect(s.state.memory).toBe(10);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
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
});

describe("BT16-005 Dorimon — KB Q&A rulings", () => {
  async function battleToMutualDeletion(options: {
    hostDp: number;
    hostAttacks: boolean;
  }): Promise<ReturnType<typeof setupEngine>> {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", dp: options.hostDp, under: ["BT16-005"] },
          { card: "BT12-049", as: "blockerAttacker", dp: 3000 },
        ],
      },
      1: { battleArea: [{ card: "BT12-049", as: "blockerDefender", dp: 3000, suspended: true }] },
    });
    await s.ready();
    s.state.memory = 0;
    const attacker = options.hostAttacks ? s.perm("host") : s.perm("blockerAttacker");
    const defenderInstanceId = s.perm("blockerDefender").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: s.perm("blockerDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === defenderInstanceId));
    await settle();
    return s;
  }

  it("triggers when Collision gave an opponent's Digimon Blocker and both battlers are deleted (Q2601)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["BT16-005"] },
          { card: "EX8-051", as: "collider", dp: 3000 },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "grantedBlocker", dp: 3000 }],
        security: ["BT1-009"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const colliderInstanceId = s.perm("collider").topCard.instanceId;
    const grantedBlockerInstanceId = s.perm("grantedBlocker").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("collider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("grantedBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === colliderInstanceId) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === grantedBlockerInstanceId),
    );
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT16-005"]);
    expect(s.state.memory).toBe(1);
  });

  it("cannot activate when its own host is deleted in the same battle as the Blocker (Q2602)", async () => {
    const hostSurvives = await battleToMutualDeletion({ hostDp: 4000, hostAttacks: true });
    expect(hostSurvives.perm("host").topCard.cardId).toBe("BT1-009");
    expect(hostSurvives.state.memory).toBe(1);

    const hostDeleted = await battleToMutualDeletion({ hostDp: 3000, hostAttacks: true });
    expect(hostDeleted.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT16-005"]),
    );
    expect(hostDeleted.state.memory).toBe(0);
  });

  it("triggers only once when two Blocker Digimon delete each other in one battle (Q2603)", async () => {
    const s = await battleToMutualDeletion({ hostDp: 3000, hostAttacks: false });

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT12-049"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT16-005"),
    ).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "memoryChanged")).toEqual([
      expect.objectContaining({ from: 0, to: 1 }),
    ]);
    expect(s.state.memory).toBe(1);
  });
});
