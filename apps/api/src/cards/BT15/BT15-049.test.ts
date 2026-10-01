import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-049.js";
import "../BT6/BT6-056.js";
import "../BT16/BT16-044.js";

describe("BT15-049", () => {
  it("marks the hand counter as Blast Digivolve", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    }));

  it("gives one of your Digimon +3000 DP and may redirect an attack on play or digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "ModifyDP", amount: 3000 },
        { kind: "RedirectAttack", condition: { kind: "duringAttack" }, optional: true },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: 3000 }, { kind: "RedirectAttack" }],
    });
  });
  it("makes itself immune to opponent Digimon effects while suspended", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } },
      ],
    }));

  it("grants immunity only while suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-049", as: "megakabuterimon", suspended: true }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestrictedByEffect(s.perm("megakabuterimon"), "beAffected", "Digimon")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("megakabuterimon").permanentId]);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("megakabuterimon"), "beAffected", "Digimon")).toBe(false);
  });

  it("Blast Digivolves from hand at Counter Timing without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT15-048", as: "base" }],
          hand: [{ card: "BT15-049", as: "megakabuterimon" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("megakabuterimon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-049");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-048"]);
  });

  it("digivolves legally from a green level-4 Digimon and applies the When Digivolving boost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-048", as: "base" }],
          hand: [{ card: "BT15-049", as: "megakabuterimon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("megakabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-049");

    expect(s.perm("base").currentDP).toBe(10000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-048"]);
  });
});

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

async function suspendedByPistmonThenOwnUnsuspendPhase(
  defender: PermanentSpec,
): Promise<{ s: EngineSetup; ownTurn: Promise<void> }> {
  const s = setupEngine(
    {
      0: { battleArea: [defender], deck: [...FILLER], security: 3 },
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

const stackOf = (s: EngineSetup, alias: string): (string | undefined)[] => [
  ...s.perm(alias).stack.map((card) => card.cardId),
  s.perm(alias).topCard?.cardId,
];

describe("BT15-049 MegaKabuterimon — KB Q&A rulings", () => {
  it("unsuspends in its next unsuspend phase after an opponent's Digimon suspends it with a can't-unsuspend lock (Q2527)", async () => {
    const megaKabuterimon = await suspendedByPistmonThenOwnUnsuspendPhase({
      card: "BT15-049",
      as: "defender",
      under: ["BT15-048"],
    });
    expect(megaKabuterimon.s.perm("defender").isSuspended).toBe(false);
    advance(megaKabuterimon.s.engine).endMainPhaseIfOpen(0);
    await megaKabuterimon.ownTurn;

    const control = await suspendedByPistmonThenOwnUnsuspendPhase({ card: "BT1-009", as: "defender" });
    expect(control.s.perm("defender").isSuspended).toBe(true);
    advance(control.s.engine).endMainPhaseIfOpen(0);
    await control.ownTurn;
  });

  it("is not de-digivolved by the [Security] effect of an opponent's Security Digimon while suspended (Q2528)", async () => {
    const megaKabuterimon = await securityChikurimonAfterAttackBy({
      card: "BT15-049",
      as: "attacker",
      under: ["BT1-065", "BT15-048"],
    });
    expect(megaKabuterimon.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT6-056");
    expect(stackOf(megaKabuterimon, "attacker")).toEqual(["BT1-065", "BT15-048", "BT15-049"]);

    const control = await securityChikurimonAfterAttackBy({
      card: "BT16-044",
      as: "attacker",
      under: ["BT1-065", "BT15-048"],
    });
    expect(stackOf(control, "attacker")).toEqual(["BT1-065", "BT15-048"]);
  });
});
