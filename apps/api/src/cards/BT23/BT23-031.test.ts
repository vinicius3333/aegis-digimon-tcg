import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, settleAcrossTimers, setupEngine, type BoardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-031.js";

const ANGEWOMON = "BT23-031";
const LADYDEVIMON = "BT23-067"; // exact name [LadyDevimon]
const LADYDEVIMON_X = "EX7-058"; // "LadyDevimon (X Antibody)" — a different printed name
const MIREI = "BT22-089"; // Tamer [Mirei Mikagura]
const SECURITY_OPTION = "BT23-100"; // carries a [Security] effect; must stay dormant when moved to hand

/** Play Angewomon from hand with `memory` available and wait for both On Play clauses to settle. */
function playFromHand(memory: number, board: BoardSpec) {
  const s = setupEngine(board, { autoSelectCards: true });
  s.state.memory = memory;
  return s;
}

describe("BT23-031 Angewomon", () => {
  it("matches every catalog field and the complete compiled clause set", () => {
    expect(getCardDefinition(ANGEWOMON)).toMatchObject({
      cardId: ANGEWOMON,
      nameEn: "Angewomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 3 },
        { color: "Purple", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Archangel", "CS"],
      inheritedEffectText: "＜Alliance＞",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gates the play-cost reduction on an exact-name [LadyDevimon] or [Mirei Mikagura]", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              // Bracket-only references are exact names (comprehensive rules 2-3-1-2).
              nameOrTrait: [{ tokens: ["LadyDevimon", "Mirei Mikagura"], match: "nameExact" }],
            },
          },
        },
      ],
    });
  });

  it("adds the top security card to hand, then recovers when three or fewer remain", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "toHand",
        controller: "mine",
        amount: 1,
        toTop: true,
      });
      expect(actions[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Alliance" }],
    });
  });

  // --- the play-cost reduction ---

  it("costs 4 instead of 7 when you control an exact [LadyDevimon]", async () => {
    const s = playFromHand(10, {
      0: {
        battleArea: [{ card: LADYDEVIMON, as: "lady" }],
        hand: [{ card: ANGEWOMON, as: "angewomon" }],
        security: [{ card: "BT1-009", as: "secTop" }, "BT1-010", "BT1-011", "BT1-012"],
        deck: [{ card: "BT1-013", as: "recovered" }],
      },
    });
    const angewomonId = s.inst("angewomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angewomonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("costs 4 instead of 7 when you control [Mirei Mikagura]", async () => {
    const s = playFromHand(10, {
      0: {
        battleArea: [{ card: MIREI, as: "mirei" }],
        hand: [{ card: ANGEWOMON, as: "angewomon" }],
        deck: ["BT1-009"],
      },
    });
    const angewomonId = s.inst("angewomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angewomonId));

    expect(s.state.memory).toBe(6);
  });

  it("costs the full 7 with no [LadyDevimon] and no [Mirei Mikagura]", async () => {
    const s = playFromHand(10, { 0: { hand: [{ card: ANGEWOMON, as: "angewomon" }], deck: ["BT1-009"] } });
    const angewomonId = s.inst("angewomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angewomonId));

    expect(s.state.memory).toBe(3);
  });

  it("ignores a near-name [LadyDevimon (X Antibody)], a hand copy, a trash copy and the opponent's copy", async () => {
    const angewomonInHand = { card: ANGEWOMON, as: "angewomon" };
    for (const board of [
      { 0: { battleArea: [{ card: LADYDEVIMON_X }], hand: [angewomonInHand], deck: ["BT1-009"] } },
      { 0: { hand: [{ card: LADYDEVIMON }, angewomonInHand], deck: ["BT1-009"] } },
      { 0: { trash: [{ card: LADYDEVIMON }], hand: [angewomonInHand], deck: ["BT1-009"] } },
      {
        0: { hand: [angewomonInHand], deck: ["BT1-009"] },
        1: { battleArea: [{ card: LADYDEVIMON }] },
      },
    ]) {
      const s = playFromHand(10, board);
      const angewomonId = s.inst("angewomon").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angewomonId));

      expect(s.state.memory).toBe(3);
    }
  });

  // --- the On Play / When Digivolving security clause ---

  it("moves the physical top security card to hand and recovers back to four, without firing its Security effect", async () => {
    const s = playFromHand(10, {
      0: {
        hand: [{ card: ANGEWOMON, as: "angewomon" }],
        security: [{ card: SECURITY_OPTION, as: "secTop" }, "BT1-009", "BT1-010", "BT1-011"],
        deck: [{ card: "BT1-012", as: "recovered" }, "BT1-013"],
      },
    });
    const angewomonId = s.inst("angewomon").instanceId;
    const secTopId = s.inst("secTop").instanceId;
    const recoveredId = s.inst("recovered").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId));

    const player = s.state.players[0]!;
    expect(player.security).toHaveLength(4);
    expect(player.security[0]!.instanceId).toBe(recoveredId);
    expect(player.security[0]!.faceUp).toBe(false);
    expect(player.security.some((card) => card.instanceId === secTopId)).toBe(false);
    expect(player.hand.map((card) => card.instanceId)).toEqual([secTopId]);
    // The [Security] effect on the moved card belongs to a security check, not to this move.
    expect(player.trash.some((card) => card.instanceId === secTopId)).toBe(false);
    expect(player.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([angewomonId]);
    expect(player.deck.map((card) => card.instanceId)).not.toContain(recoveredId);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not recover when five security cards leave four behind", async () => {
    const s = playFromHand(10, {
      0: {
        hand: [{ card: ANGEWOMON, as: "angewomon" }],
        security: [{ card: "BT1-013", as: "secTop" }, "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        deck: [{ card: "BT1-014", as: "deckTop" }],
      },
    });
    const angewomonId = s.inst("angewomon").instanceId;
    const secTopId = s.inst("secTop").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === secTopId));

    const player = s.state.players[0]!;
    expect(player.security).toHaveLength(4);
    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
    expect(player.hand.map((card) => card.instanceId)).toEqual([secTopId]);
  });

  it("Q5276: recovers from an empty security stack even though no card can be added to hand", async () => {
    const s = playFromHand(10, {
      0: {
        hand: [{ card: ANGEWOMON, as: "angewomon" }],
        security: [],
        deck: [{ card: "BT1-012", as: "recovered" }, "BT1-013"],
      },
    });
    const angewomonId = s.inst("angewomon").instanceId;
    const recoveredId = s.inst("recovered").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId));

    const player = s.state.players[0]!;
    expect(player.security).toHaveLength(1);
    expect(player.security[0]!.instanceId).toBe(recoveredId);
    expect(player.security[0]!.faceUp).toBe(false);
    expect(player.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // --- evolution routes ---

  for (const [label, source, cost] of [
    ["yellow Lv.4", "BT1-055", 3],
    ["purple Lv.4", "BT11-078", 3],
    ["[CS] Lv.4 of any colour", "BT23-008", 3],
  ] as const) {
    it(`digivolves from a ${label} source for ${cost}, draws one and fires its When Digivolving clause`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: source, as: "host" }],
            hand: [{ card: ANGEWOMON, as: "angewomon" }],
            security: [{ card: "BT1-009", as: "secTop" }, "BT1-010", "BT1-011", "BT1-012"],
            deck: [
              { card: "BT1-013", as: "drawn" },
              { card: "BT1-014", as: "recovered" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 5;
      const hostId = s.inst("host").instanceId;
      const angewomonId = s.inst("angewomon").instanceId;
      const secTopId = s.inst("secTop").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: angewomonId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.perm("host").topCard?.instanceId === angewomonId &&
          s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId),
      );

      const player = s.state.players[0]!;
      expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([hostId]);
      expect(s.state.memory).toBe(5 - cost);
      expect(player.hand.map((card) => card.instanceId).sort()).toEqual([s.inst("drawn").instanceId, secTopId].sort());
      expect(player.security).toHaveLength(4);
      expect(player.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
      expect(player.deck).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
    });
  }

  it("refuses a level 3 source that matches neither printed requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-046", as: "host" }], // yellow Lv.3, no [CS] trait
        hand: [{ card: ANGEWOMON, as: "angewomon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("angewomon").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("host").instanceId);
    expect(s.state.memory).toBe(5);
  });

  // --- the inherited ＜Alliance＞ ---

  it("grants inherited Alliance to its carrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-10", as: "carrier", under: [ANGEWOMON] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(true);
  });

  it("suspends the accepted ally, adds its DP and raises the security attack count", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST3-10", as: "carrier", under: [ANGEWOMON] },
          { card: "BT1-014", dp: 4000, as: "ally" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-014", dp: 7000, suspended: true, as: "defender" },
          { card: "ST18-07", dp: 7000, as: "blocker" },
        ],
      },
    });
    await s.ready();
    const carrier = s.perm("carrier");
    const ally = s.perm("ally");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"), 3000);

    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended, 3000);

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("carrier").currentDP).toBe(16000);
    expect(s.perm("carrier").securityAttack).toBe(2);

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("defender").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === carrier.permanentId)).toBe(true);
  });

  it("leaves the ally unsuspended and the attack unchanged when Alliance is refused", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST3-10", as: "carrier", under: [ANGEWOMON] },
          { card: "BT1-014", dp: 4000, as: "ally" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-014", dp: 7000, suspended: true, as: "defender" },
          { card: "ST18-07", dp: 7000, as: "blocker" },
        ],
      },
    });
    await s.ready();
    const carrier = s.perm("carrier");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"), 3000);

    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: undefined })).toEqual({ ok: true });

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("carrier").currentDP).toBe(12000);
    expect(s.perm("carrier").securityAttack).toBe(1);

    // Combat resolution parks on a timer between the alliance prompt and the security check;
    // `settle` alone cannot cross that boundary.
    await settleAcrossTimers(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("defender").instanceId),
    );
    await settle();
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("carrier").currentDP).toBe(12000);
  });

  it("checks two security cards when the Alliance-boosted carrier attacks the player", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST3-10", as: "carrier", under: [ANGEWOMON] },
          { card: "BT1-014", dp: 4000, as: "ally" },
        ],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-012"] },
    });
    await s.ready();
    const carrier = s.perm("carrier");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"), 3000);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });

    await settle(() => s.state.players[1]!.security.length === 1, 3000);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.perm("ally").isSuspended).toBe(true);
  });
});
