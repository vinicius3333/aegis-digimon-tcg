import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-047.js";
import "./index.js";

describe("BT17-047 Parrotmon", () => {
  it("matches the catalog identity and evolution route", () => {
    expect(getCardDefinition("BT17-047")).toMatchObject({
      cardId: "BT17-047",
      colors: ["Green"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
    });
  });

  it("plays itself from security at battle end only when you have no Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, isSelf: true },
      condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Digimon"] } },
    });
  });

  it("suspends one opposing Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
  });

  it("once per turn unsuspends after deleting an opponent's Digimon in battle", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ event: "whenDeletesInBattle", actions: [{ kind: "Unsuspend", target: { isSelf: true } }] }],
    });
  });

  it("plays itself after its security battle when its owner has no Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT17-047", as: "parrotmon" }] },
      1: { battleArea: [{ card: "BT4-035", dp: 12000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const parrotmonId = s.inst("parrotmon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === parrotmonId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === parrotmonId)).toBe(false);
  });

  it("suspends an opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-047", as: "parrotmon" }] },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("parrotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("unsuspends its evolved host after deleting an opponent in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-048", dp: 12000, under: ["BT17-047"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-020", dp: 6000, suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
  });
  it("stays in the trash after its security battle when its owner still has a Digimon", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT17-047", as: "parrotmon" }],
        battleArea: [{ card: "BT1-013", dp: 20000, as: "guard" }],
        hand: [{ card: "BT1-009", as: "spare" }],
      },
      1: { battleArea: [{ card: "BT4-035", dp: 12000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const parrotmonId = s.inst("parrotmon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === parrotmonId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([parrotmonId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("guard").instanceId,
    ]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("suspends exactly the chosen opposing Digimon when digivolving and spends 3 memory", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-025", as: "turuiemon" }],
          hand: [
            { card: "BT17-047", as: "parrotmon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 20000, as: "chosen" },
            { card: "BT1-009", dp: 20000, as: "spared" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 3;
    await s.ready();
    const turuiemonId = s.inst("turuiemon").instanceId;
    const parrotmonId = s.inst("parrotmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: parrotmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chosen").isSuspended);

    expect(s.perm("turuiemon").topCard?.instanceId).toBe(parrotmonId);
    expect(s.perm("turuiemon").stack.map((card) => card.instanceId)).toEqual([turuiemonId]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("spared").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("unsuspends its host only once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", dp: 20000, under: ["BT17-047"], as: "host" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 1000, suspended: true, as: "first" },
            { card: "BT1-009", dp: 1000, suspended: true, as: "second" },
            { card: "BT1-009", dp: 1000, suspended: true, as: "third" },
          ],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const thirdPermanentId = s.perm("third").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    // The opponent's turn start unsuspended its own Digimon; a Digimon can only be attacked
    // while suspended, so re-suspend the last target through the production verb.
    await advance(s.engine).verb.suspend([thirdPermanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: thirdPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  it("still plays itself from security when the only Digimon you have sits in breeding, per CR 3-4-5-8", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT17-047", as: "parrotmon" }],
        breeding: { card: "BT1-009", dp: 20000, as: "hatchling" },
        hand: [{ card: "BT1-009", as: "spare" }],
      },
      1: { battleArea: [{ card: "BT4-035", dp: 12000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const parrotmonId = s.inst("parrotmon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === parrotmonId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([parrotmonId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === parrotmonId)).toBe(false);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("hatchling").instanceId);
  });
});
