import { describe, expect, it } from "vitest";
import { Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX4-004.js";
import "../index.js";

const inertSecurity = ["BT1-013", "BT1-012"];
const inertOpponentDeck = ["BT1-013", "BT1-012"];

describe("EX4-004 Pinamon — catalog and IR", () => {
  it("matches the catalog identity and inherited clause", () => {
    expect(getCardDefinition("EX4-004")).toMatchObject({
      cardId: "EX4-004",
      nameEn: "Pinamon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Bird"],
      inheritedEffectText: "[On Deletion] If deleted outside of a battle, gain 1 memory.",
    });
  });

  it("registers a complete inherited IR watcher", () => {
    expect(runtimeCompiledCard("EX4-004")).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "not",
              condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
              raw: "deleted outside of a battle",
            },
          },
        ],
        isInherited: true,
      },
    ]);
  });
});

describe("EX4-004 Pinamon — public hatch and stack behavior", () => {
  it("hatches, digivolves for 1, draws only the ordinary evolution card, and gains memory on effect deletion", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX4-004", as: "pinamon" }],
        hand: [{ card: "ST6-02", as: "evolution" }],
        deck: [
          { card: "BT1-013", as: "evolutionDraw" },
          { card: "BT1-012", as: "remaining" },
        ],
        security: inertSecurity,
      },
      1: { deck: inertOpponentDeck, security: inertSecurity },
    });
    s.state.turnSeat = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    s.engine.applyIntent(0, { type: "hatchEgg" });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("pinamon").instanceId);
    const eggInstanceId = s.inst("pinamon").instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "ST6-02");

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === breedingPermanentId));

    const host = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === breedingPermanentId)!;
    expect(host.topCard?.cardId).toBe("ST6-02");
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["EX4-004"]);

    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([breedingPermanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("evolution").instanceId),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

  it("rejects a direct level-5 route from the level-2 egg", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX4-004", as: "pinamon" }],
        hand: [{ card: "ST6-09", as: "illegalEvolution" }],
        deck: ["BT1-013"],
        security: inertSecurity,
      },
      1: { deck: inertOpponentDeck, security: inertSecurity },
    });
    s.state.turnSeat = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    s.engine.applyIntent(0, { type: "hatchEgg" });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("pinamon").instanceId);
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("illegalEvolution").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.breeding!.topCard?.cardId).toBe("EX4-004");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("illegalEvolution").instanceId,
    );

    advance(s.engine).endMainPhaseIfOpen(0);
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });
});

describe("EX4-004 Pinamon — deletion boundaries and Q3439", () => {
  it("does not gain memory when the host is deleted in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST6-09", as: "host", under: ["EX4-004", "ST6-02", "ST6-08"] }],
        deck: inertOpponentDeck,
        security: inertSecurity,
      },
      1: {
        battleArea: [{ card: "ST6-09", as: "opponent", under: ["ST6-08"], suspended: true }],
        deck: inertOpponentDeck,
        security: inertSecurity,
      },
    });
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // CR §3-1-3-9 redirects a Digi-Egg only into private areas, so the deleted host trashes
    // its EX4-004 digivolution card along with the rest of the stack.
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["ST6-09", "ST6-08", "EX4-004"]),
    );
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
  });

  it("gains memory when Retaliation deletes its host, as ruled by Q3439", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-09", as: "host", under: ["EX4-004", "ST6-02", "ST6-08"] }],
          deck: inertOpponentDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT10-078", as: "retaliator", under: ["BT21-010"], suspended: true }],
          deck: inertOpponentDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("retaliator").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // CR §3-1-3-9 redirects a Digi-Egg only into private areas, so the deleted host trashes
    // its EX4-004 digivolution card along with the rest of the stack.
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["ST6-09", "ST6-08", "EX4-004"]),
    );
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
  });
});
