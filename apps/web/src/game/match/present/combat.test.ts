import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import type { OpenAttack } from "../../fieldClash";
import { combatScenes } from "./combat";
import { FIELD_CLASH_TOTAL_MS } from "../../timings";

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

/**
 * Room RQT-ggviX, batches 174-179: EX13-076 digivolves on perm-2, suspends perm-1, returns
 * its digivolution cards to the deck, and has perm-2 battle it. An effect battle opens no
 * attack and no `combatResolved`; the comparison receipt is the one the engine now sends.
 */
const PALADIN_TRIGGERED: ServerEvent = {
  kind: "effectTriggered",
  seat: 0,
  sourceCardId: "EX13-076",
  sourceInstanceId: "s0-47",
  sourcePermanentId: "perm-2",
  effectKey: "EX13-076/ir-shared-paladin-suspend-battle",
  description: "Have this Digimon battle it.",
  timing: "WhenDigivolving",
};
const PALADIN_COMPARED: ServerEvent = {
  kind: "battleCompared",
  attackerPermanentId: "perm-2",
  defenderPermanentId: "perm-1",
  loserPermanentIds: ["perm-1"],
  effectBattle: {
    attackerSeat: 0,
    attackerCardId: "EX13-076",
    attackerArtId: "EX13-076",
    defenderCardId: "BT25-085",
    defenderArtId: "BT25-085",
  },
};
const PALADIN_DELETION: ServerEvent = {
  kind: "cardsMoved",
  instanceIds: ["s1-29"],
  from: "battleArea",
  to: "trash",
  deletedPermanents: [{ permanentId: "perm-1", instanceId: "s1-29", cardId: "BT25-085", artId: "BT25-085", seat: 1 }],
  battleDeletion: true,
};
const PALADIN_BATCHES: readonly (readonly ServerEvent[])[] = [
  [PALADIN_TRIGGERED],
  [{ kind: "cardsMoved", instanceIds: ["perm-1"], from: "unsuspended", to: "suspended" }],
  [{ kind: "cardsMoved", instanceIds: ["s1-51", "s1-7", "s1-15"], from: "battleArea", to: "deck" }],
  [PALADIN_COMPARED, PALADIN_DELETION],
  [{ ...PALADIN_TRIGGERED, kind: "effectResolved" } as ServerEvent],
];

describe("combatScenes for an effect battle", () => {
  it("strikes the loser behind its own connecting arrow before its burst", () => {
    const observations = scenesOver(PALADIN_BATCHES);
    const battle = observations[3]!;
    expect(battle.clashScenes).toHaveLength(1);
    expect(battle.clashScenes[0]).toMatchObject({
      attacker: { permanentId: "perm-2", cardId: "EX13-076", artId: "EX13-076" },
      defender: { permanentId: "perm-1", cardId: "BT25-085", artId: "BT25-085" },
      loserPermanentIds: ["perm-1"],
      effectBattle: true,
    });
    // The renderer draws a clash's arrow under this key; no attack declaration owns one.
    expect(battle.clashScenes[0]!.arrowKey).toBe(`clash:${battle.clashScenes[0]!.key}`);
    expect([...battle.clashLoserIds]).toEqual(["perm-1"]);
    expect(battle.clashLeadInMsByPermanent.get("perm-1")).toBe(FIELD_CLASH_TOTAL_MS);
    expect(observations.flatMap((entry) => entry.clashScenes)).toHaveLength(1);
    expect(observations.flatMap((entry) => [...entry.beaten])).toEqual([]);
  });

  it("strikes both cards of a tie", () => {
    const tie: ServerEvent = { ...PALADIN_COMPARED, loserPermanentIds: ["perm-2", "perm-1"] };
    const [observed] = scenesOver([[tie]]);
    expect(observed!.clashScenes[0]?.loserPermanentIds).toEqual(["perm-2", "perm-1"]);
  });

  it("still meets with no card struck when no Digimon can be deleted", () => {
    const [observed] = scenesOver([[{ ...PALADIN_COMPARED, loserPermanentIds: [] }]]);
    expect(observed!.clashScenes).toHaveLength(1);
    expect(observed!.clashScenes[0]!.loserPermanentIds).toEqual([]);
    expect(observed!.clashLoserIds.size).toBe(0);
  });

  it("keeps the declared attack's own battle when an effect battles the same pair first", () => {
    const effectCompared: ServerEvent = {
      kind: "battleCompared",
      attackerPermanentId: "perm-1",
      defenderPermanentId: "perm-3",
      loserPermanentIds: ["perm-3"],
      effectBattle: { attackerSeat: 1, attackerCardId: "BT24-011", defenderCardId: "BT11-040" },
    };
    const attackCompared: ServerEvent = {
      kind: "battleCompared",
      attackerPermanentId: "perm-1",
      defenderPermanentId: "perm-3",
      loserPermanentIds: ["perm-3"],
    };
    // Protection spares perm-3 from the effect's blow, then the attack's battle compares.
    const protectedRun = scenesOver([
      [RAID_REDIRECT, effectCompared, { kind: "barrierPrompt", permanentId: "perm-3" }],
      [{ kind: "barrierResolved", permanentId: "perm-3", accepted: true }],
      [attackCompared],
    ]);
    expect(protectedRun.map((entry) => entry.clashScenes.map((scene) => scene.effectBattle ?? false))).toEqual([
      [true],
      [],
      [false],
    ]);
    // Deleted by the effect's battle, perm-3 takes that blow once, not the attack's too.
    const deletedRun = scenesOver([[RAID_REDIRECT, effectCompared], [BATTLE_DELETION]]);
    expect(deletedRun.flatMap((entry) => entry.clashScenes)).toHaveLength(1);
    expect(deletedRun.flatMap((entry) => [...entry.beaten])).toEqual([]);
  });
});
