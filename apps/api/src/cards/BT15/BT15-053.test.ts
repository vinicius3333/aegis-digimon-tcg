import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-053.js";

describe("BT15-053", () => {
  it("matches the catalog identity and green level-6 evolution route", () => {
    expect(getCardDefinition("BT15-053")).toMatchObject({
      nameEn: "HerculesKabuterimon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      types: ["Insectoid"],
    });
  });

  it("suspends an opposing Digimon and grants one of yours Piercing", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Suspend" }, { kind: "GainKeyword", keyword: { keyword: "Piercing" } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Suspend" }, { kind: "GainKeyword" }],
    });
  });
  it("is immune to opponent Digimon effects while suspended", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } },
      ],
    }));

  it("naturally resolves When Digivolving by suspending an opposing Digimon and granting Piercing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-049", as: "base" }],
          hand: [{ card: "BT15-053", as: "hercules" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hercules").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-053" && s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("naturally resolves Start of Your Main Phase with the same suspend and Piercing behavior", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-053", as: "hercules" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("target").isSuspended && observe(s.engine).hasPierce(s.perm("hercules")));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("hercules"))).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("while suspended, naturally rejects an opponent Digimon effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-053", as: "hercules", suspended: true }] },
        1: { hand: [{ card: "BT15-052", as: "puppetmon" }] },
      },
      { autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    s.state.memory = 20;
    await s.ready();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("hercules"), "beAffected", "Digimon")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("puppetmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-052"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard!.cardId)).toContain("BT15-053");
    expect(s.perm("hercules").isSuspended).toBe(true);
  });
});

async function ginryumonLockOnOpponentTurn(opposingCard: string) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT15-055", as: "base", under: ["BT14-086"] }],
        hand: [{ card: "BT15-058", as: "ginryumon" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: opposingCard, as: "suspendTarget" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );

  await s.ready();
  s.state.memory = 10;
  const firstTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("ginryumon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("base").topCard?.cardId === "BT15-058" &&
      s.perm("suspendTarget").isSuspended &&
      s.state.pendingDecision === undefined,
  );
  const lockedAfterSuspension = observe(s.engine).hasRestriction(s.perm("suspendTarget"), "unsuspend");
  advance(s.engine).endMainPhaseIfOpen(0);
  await firstTurn;

  s.state.turnSeat = 1;
  s.state.memory = 10;
  const opponentTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(1);
  const suspendedInMainPhase = s.perm("suspendTarget").isSuspended;
  advance(s.engine).endMainPhaseIfOpen(1);
  await opponentTurn;
  return { lockedAfterSuspension, suspendedInMainPhase };
}

async function attackIntoSecurityDynasmon(attacker: PermanentSpec) {
  const s = setupEngine(
    {
      0: { battleArea: [{ ...attacker, as: "attacker" }], deck: ["BT1-009", "BT1-009"] },
      1: { security: [{ card: "AD1-017", as: "dynasmon" }], deck: ["BT1-009"] },
    },
    { autoSelectCards: true },
  );

  await s.ready();
  s.state.memory = 3;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      !observe(s.engine).isAttacking() &&
      s.state.pendingDecision === undefined &&
      s.state.players[1]!.security.length === 0,
  );
  return { s, turn };
}

describe("BT15-053 HerculesKabuterimon — KB Q&A rulings", () => {
  it("unsuspends normally after an opponent's Digimon suspends it with a can't-unsuspend rider, because it is immune once suspended (Q2536)", async () => {
    const hercules = await ginryumonLockOnOpponentTurn("BT15-053");
    expect(hercules.lockedAfterSuspension).toBe(false);
    expect(hercules.suspendedInMainPhase).toBe(false);

    const ordinaryDigimon = await ginryumonLockOnOpponentTurn("BT1-009");
    expect(ordinaryDigimon.lockedAfterSuspension).toBe(true);
    expect(ordinaryDigimon.suspendedInMainPhase).toBe(true);
  });

  it("is not affected by the [Security] effect of an opponent's Security Digimon while suspended (Q2537)", async () => {
    const hercules = await attackIntoSecurityDynasmon({ card: "BT15-053" });
    expect(hercules.s.perm("attacker").isSuspended).toBe(true);
    expect(hercules.s.perm("attacker").currentDP).toBe(12000);
    expect(hercules.s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT15-053"]);
    expect(hercules.s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("AD1-017");
    advance(hercules.s.engine).endMainPhaseIfOpen(0);
    await hercules.turn;

    const unprotected = await attackIntoSecurityDynasmon({ card: "BT1-009", dp: 12000 });
    expect(unprotected.s.state.players[0]!.battleArea).toHaveLength(0);
    advance(unprotected.s.engine).endMainPhaseIfOpen(0);
    await unprotected.turn;
  });
});
