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
  it.each([true, false])("lands the compared blow before Barrier's answer (%s), once", (accepted) => {
    const compared: ServerEvent = {
      kind: "battleCompared",
      attackerPermanentId: "perm-1",
      defenderPermanentId: "perm-3",
      loserPermanentIds: ["perm-3"],
    };
    const observations = scenesOver([
      [RAID_REDIRECT, compared, { kind: "barrierPrompt", permanentId: "perm-3" }],
      [{ kind: "barrierResolved", permanentId: "perm-3", accepted }],
      ...(accepted ? [] : [[BATTLE_DELETION]]),
      [{ ...COMBAT_RESOLVED, deletedPermanentIds: accepted ? [] : ["perm-3"] }],
    ]);
    expect(observations[0]!.clashScenes[0]?.loserPermanentIds).toEqual(["perm-3"]);
    expect(observations.flatMap((entry) => entry.clashScenes)).toHaveLength(1);
    expect(observations.flatMap((entry) => [...entry.beaten])).toEqual([]);
  });

  it("keeps both initially losing cards in a tie before either protection question", () => {
    const observations = scenesOver([
      [
        RAID_REDIRECT,
        {
          kind: "battleCompared",
          attackerPermanentId: "perm-1",
          defenderPermanentId: "perm-3",
          loserPermanentIds: ["perm-1", "perm-3"],
        },
        { kind: "barrierPrompt", permanentId: "perm-1" },
      ],
    ]);
    expect(observations[0]!.clashScenes[0]?.loserPermanentIds).toEqual(["perm-1", "perm-3"]);
  });

  it("ignores a different effect-driven battle during an open attack", () => {
    const observations = scenesOver([
      [
        RAID_REDIRECT,
        {
          kind: "battleCompared",
          attackerPermanentId: "perm-1",
          defenderPermanentId: "other-defender",
          loserPermanentIds: ["other-defender"],
        },
      ],
    ]);
    expect(observations[0]!.clashScenes).toEqual([]);
  });
  it("keeps the staged battle through Piercing's security checks until combatResolved", () => {
    const securityRevealed = {
      kind: "securityRevealed",
      seat: 0,
      revealedCardId: "BT1-010",
      attackerPermanentId: "perm-1",
      securityCardDP: 2000,
      attackerDP: 11000,
      securityCountBefore: 5,
      hasSecurityEffect: false,
      isDigimon: true,
    } as ServerEvent;
    const securityChecked = {
      kind: "securityChecked",
      seat: 0,
      revealedCardId: "BT1-010",
      resolution: "battle",
    } as ServerEvent;
    const observations = scenesOver([
      [RAID_REDIRECT],
      [BATTLE_DELETION],
      [securityRevealed],
      [securityChecked],
      [COMBAT_RESOLVED],
    ]);
    expect(observations.flatMap((entry) => entry.clashScenes)).toHaveLength(1);
    expect([...observations.at(-1)!.beaten]).toEqual([]);
  });
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
