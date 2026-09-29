import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
  type SeatSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-047.js";
import "../BT6/BT6-056.js";
import "../BT16/BT16-044.js";
import "../BT18/BT18-052.js";
import "../BT21/BT21-061.js";

describe("BT15-047", () => {
  it("makes this suspended Digimon immune to opponent Digimon effects", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } },
      ],
    }));
  it("gains 1 memory once per turn when this Digimon deletes in battle", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", sourceFilter: { isSelfRef: true } }],
    }));

  it("grants Digimon-effect immunity only while suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-047", as: "kabuterimon", suspended: true }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestrictedByEffect(s.perm("kabuterimon"), "beAffected", "Digimon")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("kabuterimon").permanentId]);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("kabuterimon"), "beAffected", "Digimon")).toBe(false);
  });

  it("gains memory once for a battle deletion and again after the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST4-09", as: "host", under: ["BT15-047"] }],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-009", "BT1-010", "BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "firstTarget", suspended: true, dp: 1000 },
          { card: "BT1-009", as: "secondTarget", suspended: true, dp: 1000 },
          { card: "BT1-009", as: "thirdTarget", suspended: true, dp: 1000 },
        ],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("thirdTarget").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("thirdTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("digivolves legally from a green level-3 Digimon and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-065", as: "base" }],
        hand: [{ card: "BT15-047", as: "kabuterimon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-047");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-065"]);
  });
});

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

async function suspendedByPistmonThenOwnUnsuspendPhase(
  defenderCard: string,
): Promise<{ s: EngineSetup; ownTurn: Promise<void> }> {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: defenderCard, as: "defender" }], deck: [...FILLER], security: 3 },
      1: { hand: [{ card: "BT16-044", as: "pistmon" }], deck: [...FILLER], security: 4 },
    },
    { autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.memory = 10;
  const opponentTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("pistmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("defender").isSuspended);
  await drainMicrotasks();
  advance(s.engine).endMainPhaseIfOpen(1);
  await opponentTurn;

  s.state.turnSeat = 0;
  s.state.memory = 3;
  const ownTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  return { s, ownTurn };
}

async function securityChikurimonAfterAttackBy(attacker: PermanentSpec): Promise<EngineSetup> {
  const s = setupEngine({
    0: { battleArea: [attacker], deck: [...FILLER], security: 3 },
    1: { security: ["BT6-056"], deck: [...FILLER] },
  });
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await drainMicrotasks();
  return s;
}

async function playDeDigivolverAgainst(playedCard: string, seat0: SeatSpec, middleCard: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: { hand: [{ card: playedCard, as: "played" }], deck: [...FILLER], ...seat0 },
      1: {
        battleArea: [{ card: "BT16-044", as: "target", suspended: true, under: ["BT1-065", middleCard] }],
        deck: [...FILLER],
        security: 3,
      },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === playedCard));
  await drainMicrotasks();
  return s;
}

const stackOf = (s: EngineSetup, alias: string): (string | undefined)[] => [
  ...s.perm(alias).stack.map((card) => card.cardId),
  s.perm(alias).topCard?.cardId,
];

describe("BT15-047 Kabuterimon — KB Q&A rulings", () => {
  it("unsuspends in its next unsuspend phase after an opponent's Digimon suspends it with a can't-unsuspend lock (Q2525)", async () => {
    const kabuterimon = await suspendedByPistmonThenOwnUnsuspendPhase("BT15-047");
    expect(kabuterimon.s.perm("defender").isSuspended).toBe(false);
    advance(kabuterimon.s.engine).endMainPhaseIfOpen(0);
    await kabuterimon.ownTurn;

    const control = await suspendedByPistmonThenOwnUnsuspendPhase("BT1-009");
    expect(control.s.perm("defender").isSuspended).toBe(true);
    advance(control.s.engine).endMainPhaseIfOpen(0);
    await control.ownTurn;
  });

  it("is not de-digivolved by the [Security] effect of an opponent's Security Digimon while suspended (Q2526)", async () => {
    const kabuterimon = await securityChikurimonAfterAttackBy({
      card: "BT15-047",
      as: "attacker",
      under: ["BT1-065"],
    });
    expect(kabuterimon.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT6-056");
    expect(stackOf(kabuterimon, "attacker")).toEqual(["BT1-065", "BT15-047"]);

    const control = await securityChikurimonAfterAttackBy({ card: "BT15-048", as: "attacker", under: ["BT1-065"] });
    expect(stackOf(control, "attacker")).toEqual(["BT1-065"]);
  });

  it.fails("stops the second of two face-up-security <De-Digivolve 1> instances once it becomes the suspended top card (Q2982)", async () => {
    const faceUpSecurity: SeatSpec = {
      security: [{ card: "BT1-010", faceUp: true }, { card: "BT1-011", faceUp: true }, "BT1-012"],
    };

    const kabuterimon = await playDeDigivolverAgainst("BT18-052", faceUpSecurity, "BT15-047");
    expect(stackOf(kabuterimon, "target")).toEqual(["BT1-065", "BT15-047"]);

    const control = await playDeDigivolverAgainst("BT18-052", faceUpSecurity, "BT15-048");
    expect(stackOf(control, "target")).toEqual(["BT1-065"]);
  });

  it.fails("stops the second of two Tamer-color <De-Digivolve 1> instances once it becomes the suspended top card (Q4568)", async () => {
    const fourTamerColors: SeatSpec = {
      security: 3,
      battleArea: [
        { card: "AD1-020", as: "blueRedGreenTamer" },
        { card: "BT23-083", as: "greenBlackTamer" },
      ],
    };

    const kabuterimon = await playDeDigivolverAgainst("BT21-061", fourTamerColors, "BT15-047");
    expect(stackOf(kabuterimon, "target")).toEqual(["BT1-065", "BT15-047"]);

    const control = await playDeDigivolverAgainst("BT21-061", fourTamerColors, "BT15-048");
    expect(stackOf(control, "target")).toEqual(["BT1-065"]);
  });
});
