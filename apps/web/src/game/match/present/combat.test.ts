import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import type { OpenAttack } from "../../fieldClash";
import { combatScenes } from "./combat";

/**
 * The batches the server sent for match b42a0127 when ＜Raid＞ switched an attack off the
 * player: the redirect, the battle deletion, then — a player decision later — the
 * `combatResolved` the scene used to be cut from.
 */
const RAID_REDIRECT: ServerEvent = {
  kind: "attackDeclared",
  seat: 1,
  attackerPermanentId: "perm-1",
  attackerCardId: "BT24-011",
  attackerArtId: "BT24-011",
  target: { kind: "permanent", permanentId: "perm-3" },
  targetCardId: "BT11-040",
  targetArtId: "BT11-040",
  redirected: true,
};

const BATTLE_DELETION: ServerEvent = {
  kind: "cardsMoved",
  instanceIds: ["s0-41"],
  from: "battleArea",
  to: "trash",
  battleDeletion: true,
  deletedPermanents: [{ permanentId: "perm-3", instanceId: "s0-41", cardId: "BT11-040", artId: "BT11-040", seat: 0 }],
};

const COMBAT_RESOLVED: ServerEvent = {
  kind: "combatResolved",
  seat: 1,
  attackerPermanentId: "perm-1",
  deletedPermanentIds: ["perm-3"],
};

function scenesOver(batches: readonly (readonly ServerEvent[])[]) {
  const fieldClashKeyRef = { current: 0 };
  const openAttackRef: { current: OpenAttack | null } = { current: null };
  const lastVisibleArtRef = { current: new Map<string, string>() };
  return batches.map((fresh) =>
    combatScenes({
      fresh,
      viewerSeat: 0,
      fieldClashKeyRef,
      openAttackRef,
      anchors: { permanentCardId: () => undefined },
      lastVisibleArtRef,
    }),
  );
}

describe("combatScenes across a ＜Raid＞ redirect", () => {
  it("stages the clash with the battle deletion, not batches later with combatResolved", () => {
    const [redirect, deletion, resolved] = scenesOver([[RAID_REDIRECT], [BATTLE_DELETION], [COMBAT_RESOLVED]]);
    expect(redirect?.clashScenes).toHaveLength(0);
    expect(deletion?.clashScenes).toHaveLength(1);
    expect(deletion?.clashScenes[0]).toMatchObject({
      attacker: { permanentId: "perm-1" },
      defender: { permanentId: "perm-3", cardId: "BT11-040" },
      loserPermanentIds: ["perm-3"],
    });
    // The loser's burst waits behind the blow it just took.
    expect([...(deletion?.clashLoserIds ?? [])]).toEqual(["perm-3"]);
    expect(deletion?.combatLeadInMs).toBeGreaterThan(0);
    // The seam event is bookkeeping by then; replaying the scene would restage a dead card.
    expect(resolved?.clashScenes).toHaveLength(0);
    expect(resolved?.beaten.size).toBe(0);
  });

  it("still cuts the scene from combatResolved when the battle arrives in one batch", () => {
    const [only] = scenesOver([[RAID_REDIRECT, BATTLE_DELETION, COMBAT_RESOLVED]]);
    expect(only?.clashScenes).toHaveLength(1);
    expect([...(only?.clashLoserIds ?? [])]).toEqual(["perm-3"]);
  });
});
