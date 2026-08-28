import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-083.js";
import "../index.js";

describe("BT26-083 compiled fidelity", () => {
  it("registers the security wipe, per-card deletion, recovery, and deletion debuff", () => {
    expect(getCardDefinition("BT26-083")).toMatchObject({
      nameEn: "Junomon: Hysteric Mode",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 14,
      dp: 14000,
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
    });
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.keywords?.map(({ keyword }) => keyword)).toEqual(["Rush", "Piercing", "Execute"]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(card?.effects?.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        { kind: "SecurityManipulation", op: "trashTop", leaveCount: 0, trackCount: "trashedSecurity" },
        { kind: "RepeatPerCount", countSource: "trashedSecurity", action: { kind: "Delete" } },
        { kind: "SecurityManipulation", op: "placeFromDeck", amount: 3 },
      ]);
    }
    expect(card?.effects?.find((effect) => effect.trigger === "OnDeletion")?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: -1 },
        duration: "untilOpponentTurnEnd",
      },
    ]);
    expect(card?.digivolutionRequirement).toEqual([{ level: 6, traits: ["TS"], cost: 4, isAlternate: true }]);
    expect(card.assemblyRequirement).toEqual([{ reduceCost: 4, materials: [{ names: ["Junomon"], count: 1 }] }]);
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldLeavePlay",
        mode: "instead",
        leaveCause: "otherThanBattle",
        actions: [
          {
            kind: "PlayWithoutCost",
            fromOwnDigivolutionStack: true,
            payCost: false,
            playedByDecode: true,
            optional: true,
            target: {
              filter: {
                nameOrTrait: [{ tokens: ["Junomon"], match: "name" }],
              },
              orFilters: [
                {
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }],
                },
              ],
            },
          },
        ],
      },
    ]);
  });

  it("digivolves for 4 from a purple or yellow level 6 and from an off-color level-6 TS Digimon", async () => {
    for (const [baseCard, alternateRequirementIndex] of [
      ["AD1-016", undefined],
      ["BT26-045", 0],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "BT26-083", as: "hysteric" }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      });
      s.state.memory = 4;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("hysteric").instanceId,
          ...(alternateRequirementIndex === undefined ? {} : { alternateRequirementIndex }),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT26-083");

      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.security).toHaveLength(3);
    }
  });

  it("assembles with Junomon from trash for 10 and places the material underneath", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-083", as: "hysteric" }],
        trash: [{ card: "BT25-044", as: "junomon" }],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("hysteric").instanceId,
        assembly: { materialInstanceIds: [s.inst("junomon").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-083"));

    const hysteric = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-083");
    expect(s.state.memory).toBe(0);
    expect(hysteric?.stack.map(({ cardId }) => cardId)).toContain("BT25-044");
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("recovers three even when it has no security to trash (Q7124)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-083", as: "junomon" }], deck: ["BT1-001", "BT1-002", "BT1-003"] },
    });

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("junomon"));

    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("Decode may play a level 6 Junomon even though only the Iliad branch has a level-5 ceiling", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-083", as: "hysteric", under: [{ card: "BT25-044" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("hysteric").permanentId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT25-044"]);
  });

  it("trashes all own security, deletes one opposing Digimon per card, and recovers three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-083", as: "junomon" }],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-003", "BT1-004", "BT1-005"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
            { card: "BT1-012", as: "third" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("junomon"));

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("uses Rush and Piercing after a normal play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-083", as: "hysteric" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "defender", dp: 1000, suspended: true }],
          security: ["BT1-004", "BT1-005"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 14;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hysteric").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-083"));
    expect(observe(s.engine).hasKeyword(s.perm("hysteric"), "Rush")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("hysteric"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hysteric").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses Execute and decodes into a level-5 Iliad Digimon when it would self-delete", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-083", as: "hysteric", under: [{ card: "BT26-015", as: "iliad" }] }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "executeTarget", dp: 10000 }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("executeTarget").permanentId, s.inst("iliad").instanceId);
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("hysteric"), "Execute")).toBe(true);
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-015"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-015"]);
  });

  it("does not Decode an Iliad Digimon above level 5 unless its name contains Junomon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-083", as: "hysteric", under: [{ card: "BT26-016", as: "levelSix" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("hysteric").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-083", "BT26-016"]),
    );
  });

  it("gives every opposing Digimon Security Attack -1 when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-083", as: "hysteric" },
            { card: "BT1-009", as: "friendly" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("hysteric").permanentId], "byEffect")).toBe(1);
    await settle(() => observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack") === -1);

    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("friendly"), "SecurityAttack")).toBe(0);
  });
});
