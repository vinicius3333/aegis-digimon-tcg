import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type EngineSetup, settle, setupEngine, type BoardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-067.js";

const LADYDEVIMON = "BT23-067";
const ANGEWOMON = "BT23-031"; // exact name [Angewomon]
const ANGEWOMON_X = "BT9-040"; // "Angewomon (X Antibody)" — a different printed name
const MIREI = "BT22-089"; // Tamer [Mirei Mikagura]
const OPPONENT_LOW = "BT23-063"; // Sangloupmon, purple Lv.4 with [CS]
const OPPONENT_HIGH = "BT23-068"; // GranDracmon, purple Lv.6
const NEUTRAL = "BT1-009"; // Monodramon, a legal main-deck security/deck filler

const FILLER_DECK = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-027", "BT1-028", "BT1-045"];

/**
 * Hand the turn to seat 1 through the real turn loop, so an opponent-turn attack never needs a
 * direct `turnSeat` write. Returns the loop promise; end it with `finishTurnLoop`.
 */
async function passTurnToOpponent(s: EngineSetup, suspendAlias?: string): Promise<{ loop: Promise<void> }> {
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  await settle(() => s.state.pendingDecision === undefined);
  if (suspendAlias !== undefined) {
    // Suspend publicly: the Digimon attacks the opponent on its own turn and stays suspended into
    // the opponent's turn, which a Board Spec `suspended: true` could not survive (the Unsuspend
    // phase of seat 0's turn would clear it).
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(suspendAlias).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm(suspendAlias).isSuspended).toBe(true);
  }
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.state.turnSeat).toBe(1);
  // Returned inside a wrapper: awaiting a promise that resolves TO the loop promise would
  // flatten onto the loop and hang the test.
  return { loop };
}

async function finishTurnLoop(s: EngineSetup, loop: Promise<void>): Promise<void> {
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

/** Play LadyDevimon from hand with `memory` available; card-selection prompts answer themselves. */
function playFromHand(memory: number, board: BoardSpec) {
  const s = setupEngine(board, { autoSelectCards: true });
  s.state.memory = memory;
  return s;
}

describe("BT23-067 LadyDevimon", () => {
  it("matches every catalog field and the complete compiled clause set", () => {
    expect(getCardDefinition(LADYDEVIMON)).toMatchObject({
      cardId: LADYDEVIMON,
      nameEn: "LadyDevimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 3 },
        { color: "Yellow", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Fallen Angel", "CS"],
      inheritedEffectText: "＜Scapegoat＞",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gates the play-cost reduction on an exact-name [Angewomon] or [Mirei Mikagura] in the battle area", () => {
    const replacement = (
      compiled.effects.find((entry) => entry.trigger === "Static" && entry.actions.length > 0) as any
    ).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              // Bracket-only references are exact names (comprehensive rules 2-3-1-2); the
              // breeding area can't be referenced (3-4-5-8).
              zone: "battleArea",
              nameOrTrait: [{ tokens: ["Angewomon", "Mirei Mikagura"], match: "nameExact" }],
            },
          },
        },
      ],
    });
  });

  it("deletes one opposing level 4 or lower Digimon on both entry timings", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
      });
    }
    const staticEffects = compiled.effects.filter((entry) => entry.trigger === "Static");
    expect(staticEffects.flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? [])).toEqual([
      "Blocker",
      "Scapegoat",
    ]);
    expect(staticEffects.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Scapegoat");
    expect(staticEffects.find((entry) => entry.keywords?.[0]?.keyword === "Blocker")?.isInherited).toBeUndefined();
  });

  // --- the play-cost reduction ---

  it("costs 4 instead of 7 when you control an exact [Angewomon]", async () => {
    const s = playFromHand(10, {
      0: {
        battleArea: [{ card: ANGEWOMON, as: "angewomon" }],
        hand: [{ card: LADYDEVIMON, as: "lady" }],
        deck: [NEUTRAL],
      },
    });
    const ladyId = s.inst("lady").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ladyId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ladyId));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("costs 4 instead of 7 when you control [Mirei Mikagura]", async () => {
    const s = playFromHand(10, {
      0: { battleArea: [{ card: MIREI, as: "mirei" }], hand: [{ card: LADYDEVIMON, as: "lady" }], deck: [NEUTRAL] },
    });
    const ladyId = s.inst("lady").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ladyId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ladyId));

    expect(s.state.memory).toBe(6);
  });

  it("costs the full 7 with no [Angewomon] and no [Mirei Mikagura]", async () => {
    const s = playFromHand(10, { 0: { hand: [{ card: LADYDEVIMON, as: "lady" }], deck: [NEUTRAL] } });
    const ladyId = s.inst("lady").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ladyId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ladyId));

    expect(s.state.memory).toBe(3);
  });

  it("ignores a near-name [Angewomon (X Antibody)], a hand copy, a trash copy and the opponent's copy", async () => {
    const ladyInHand = { card: LADYDEVIMON, as: "lady" };
    for (const board of [
      { 0: { battleArea: [{ card: ANGEWOMON_X }], hand: [ladyInHand], deck: [NEUTRAL] } },
      { 0: { hand: [{ card: ANGEWOMON }, ladyInHand], deck: [NEUTRAL] } },
      { 0: { trash: [{ card: ANGEWOMON }], hand: [ladyInHand], deck: [NEUTRAL] } },
      { 0: { hand: [ladyInHand], deck: [NEUTRAL] }, 1: { battleArea: [{ card: ANGEWOMON }] } },
    ] as BoardSpec[]) {
      const s = playFromHand(10, board);
      const ladyId = s.inst("lady").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ladyId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ladyId));

      expect(s.state.memory).toBe(3);
    }
  });

  // --- the On Play / When Digivolving deletion ---

  it("deletes the opponent's level 4 Digimon on play and leaves the level 6 alone", async () => {
    const s = playFromHand(10, {
      0: { hand: [{ card: LADYDEVIMON, as: "lady" }], deck: [NEUTRAL] },
      1: {
        battleArea: [
          { card: OPPONENT_LOW, as: "low" },
          { card: OPPONENT_HIGH, as: "high" },
        ],
      },
    });
    const ladyId = s.inst("lady").instanceId;
    const lowId = s.inst("low").instanceId;
    const highId = s.inst("high").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ladyId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === lowId));

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.map((p) => p.topCard?.instanceId)).toEqual([highId]);
    expect(opponent.trash.map((card) => card.instanceId)).toEqual([lowId]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([ladyId]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes nothing when every opposing Digimon is above level 4", async () => {
    const s = playFromHand(10, {
      0: { hand: [{ card: LADYDEVIMON, as: "lady" }], deck: [NEUTRAL] },
      1: { battleArea: [{ card: OPPONENT_HIGH, as: "high" }] },
    });
    const ladyId = s.inst("lady").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ladyId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ladyId));

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([s.inst("high").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("never deletes your own level 4 Digimon", async () => {
    const s = playFromHand(10, {
      0: {
        battleArea: [{ card: OPPONENT_LOW, as: "mine" }],
        hand: [{ card: LADYDEVIMON, as: "lady" }],
        deck: [NEUTRAL],
      },
      1: { battleArea: [{ card: OPPONENT_HIGH, as: "high" }] },
    });
    const ladyId = s.inst("lady").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ladyId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ladyId));

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId).sort()).toEqual(
      [s.inst("mine").instanceId, ladyId].sort(),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  // --- evolution routes ---

  for (const [label, source, cost] of [
    ["purple Lv.4", "BT11-078", 3],
    ["yellow Lv.4", "BT1-055", 3],
    ["[CS] Lv.4 of any colour", "BT23-008", 3],
  ] as const) {
    it(`digivolves from a ${label} source for ${cost}, draws one and deletes an opposing level 4`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: source, as: "host" }],
            hand: [{ card: LADYDEVIMON, as: "lady" }],
            deck: [{ card: "BT1-013", as: "drawn" }],
          },
          1: {
            battleArea: [
              { card: OPPONENT_LOW, as: "low" },
              { card: OPPONENT_HIGH, as: "high" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 5;
      const hostId = s.inst("host").instanceId;
      const ladyId = s.inst("lady").instanceId;
      const lowId = s.inst("low").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: ladyId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === lowId));

      expect(s.perm("host").topCard?.instanceId).toBe(ladyId);
      expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([hostId]);
      expect(s.state.memory).toBe(5 - cost);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
      expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([s.inst("high").instanceId]);
      expect(s.state.pendingDecision).toBeUndefined();
    });
  }

  it("refuses a level 3 source that matches neither printed nor alternate requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-046", as: "host" }], // yellow Lv.3, no [CS] trait
        hand: [{ card: LADYDEVIMON, as: "lady" }],
        deck: [NEUTRAL, "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("host").instanceId);
    expect(s.state.memory).toBe(5);
  });

  // --- ＜Blocker＞ ---

  it("blocks an attack on the player and wins the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: LADYDEVIMON, as: "lady" }],
        hand: [{ card: NEUTRAL, as: "spare0" }],
        deck: [...FILLER_DECK],
        security: [{ card: NEUTRAL, as: "secTop" }, "BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-014", dp: 5000, as: "attacker" }],
        hand: [{ card: NEUTRAL, as: "spare1" }],
        deck: [...FILLER_DECK],
      },
    });
    await s.ready();
    const { loop } = await passTurnToOpponent(s);
    expect(observe(s.engine).hasKeyword(s.perm("lady"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"), 5000);

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("lady").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([s.inst("lady").instanceId]);
    expect(s.perm("lady").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("secTop").instanceId);
    await finishTurnLoop(s, loop);
  });

  it("does not pass Blocker down to a carrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-10", as: "carrier", under: [LADYDEVIMON] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Blocker")).toBe(false);
  });

  // --- inherited ＜Scapegoat＞ (comprehensive rules 16-32) ---

  it("lets a carrier delete another own Digimon instead of being deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST3-10", dp: 4000, as: "carrier", under: [LADYDEVIMON] },
            { card: "BT1-014", dp: 1000, as: "sacrifice" },
          ],
          hand: [{ card: NEUTRAL, as: "spare0" }],
          deck: [...FILLER_DECK],
        },
        1: {
          battleArea: [{ card: "BT1-014", dp: 9000, as: "attacker" }],
          hand: [{ card: NEUTRAL, as: "spare1" }],
          deck: [...FILLER_DECK],
          security: [NEUTRAL, NEUTRAL, NEUTRAL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await passTurnToOpponent(s, "carrier");
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Scapegoat")).toBe(true);
    const sacrificeId = s.inst("sacrifice").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("carrier").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === sacrificeId), 5000);

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([s.inst("carrier").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([sacrificeId]);
    await finishTurnLoop(s, loop);
  });

  it("deletes the carrier normally when there is no other Digimon to sacrifice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST3-10", dp: 4000, as: "carrier", under: [LADYDEVIMON] }],
          hand: [{ card: NEUTRAL, as: "spare0" }],
          deck: [...FILLER_DECK],
        },
        1: {
          battleArea: [{ card: "BT1-014", dp: 9000, as: "attacker" }],
          hand: [{ card: NEUTRAL, as: "spare1" }],
          deck: [...FILLER_DECK],
          security: [NEUTRAL, NEUTRAL, NEUTRAL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await passTurnToOpponent(s, "carrier");
    const carrierId = s.inst("carrier").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("carrier").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === carrierId), 5000);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // The whole stack goes to the trash: the carrier plus its LadyDevimon digivolution card.
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(LADYDEVIMON);
    await finishTurnLoop(s, loop);
  });

  it("does not give LadyDevimon itself Scapegoat", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: LADYDEVIMON, as: "lady" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("lady"), "Scapegoat")).toBe(false);
  });
});
