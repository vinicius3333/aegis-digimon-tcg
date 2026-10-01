import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { compiled } from "./BT16-048.js";
import "../AD1/AD1-017.js";
import "../BT21/BT21-077.js";
import "../BT8/BT8-097.js";
import "../EX10/EX10-008.js";
import "../index.js";

describe("BT16-048", () => {
  it("plays an Insectoid or Larva from hand with 8 cost reduction", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 8, optional: true }],
    });
  });

  it("is immune to opponent Digimon effects while suspended", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          grant: "immuneToOpponentDigimonEffects",
          duration: "permanent",
          condition: { kind: "selfIsSuspended" },
        },
      ],
    });
  });

  it("bottom-decks an opposing Digimon using another suspended Digimon once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "deckBottom", optional: true, abortOnDecline: true, cost: { kind: "suspend" } }],
    });
    expect(digivolutionRequirementsFor("BT16-048")).toEqual([
      { level: 6, traits: ["Insectoid"], cost: 2, isAlternate: true, basePlayCostMax: 13 },
    ]);
    expect(matchingAlternateDigivolutionRequirement("BT16-048", "BT16-046")?.cost).toBe(2);
    expect(matchingAlternateDigivolutionRequirement("BT16-048", "BT16-048")).toBeUndefined();
  });

  it("suspends another own Digimon and bottom-decks an opposing Digimon within its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-048", as: "tyrant", dp: 14000 },
            { card: "BT16-042", as: "cost", dp: 5000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 4000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).runTurn(0);

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("plays an Insectoid from hand at the printed 8-cost reduction when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-045", as: "base" }],
          hand: [
            { card: "BT16-048", as: "tyrant" },
            { card: "BT16-042", as: "played" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-042"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-042")).toBe(true);
  });

  it("uses the level-6 Insectoid alternate evolution route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-046", as: "base" }], hand: [{ card: "BT16-048", as: "tyrant" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrant").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-048");

    expect(s.state.memory).toBe(0);
  });
});

type CollisionGranter = "BT21-077" | "EX10-008";

async function forcedAttackOutcome(granter: CollisionGranter, grantee: string) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-013", as: "wall" }],
        hand: [{ card: granter, as: "granter" }, { card: "BT21-010", as: "gammamonCost" }, "BT1-013"],
        security: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: grantee, as: "grantee", dp: 20_000 }],
        hand: ["BT1-013"],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  await s.ready();
  preferred.push(
    s.inst("gammamonCost").instanceId,
    s.perm("grantee").permanentId,
    s.perm("grantee").topCard.instanceId,
  );
  s.state.memory = 7;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("granter").instanceId })).toEqual({ ok: true });
  await settle(() => observe(s.engine).hasKeyword(s.perm("grantee"), "Collision"));

  s.state.turnSeat = 1;
  s.state.memory = -s.state.memory;
  const opponentTurn = s.engine.runOneTurn();
  await settle(
    () =>
      observe(s.engine).blockingSeat() === 0 ||
      (observe(s.engine).hasAttackedThisTurn(s.perm("grantee")) && !observe(s.engine).isAttacking()),
    4000,
  );

  const outcome = {
    attacked: observe(s.engine).hasAttackedThisTurn(s.perm("grantee")),
    suspended: s.perm("grantee").isSuspended,
    hasCollision: observe(s.engine).hasKeyword(s.perm("grantee"), "Collision"),
    forcedToBlock: observe(s.engine).blockingSeat() === 0,
    declineBlockAccepted: false,
    defenderSecurityCount: 0,
  };
  if (outcome.forcedToBlock) {
    outcome.declineBlockAccepted = s.engine.applyIntent(0, { type: "declineBlock" }).ok;
    s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("wall").permanentId });
    await settle(() => !observe(s.engine).isAttacking(), 4000);
  }
  outcome.defenderSecurityCount = s.state.players[0]!.security.length;

  await advance(s.engine).waitForMainPhase(1);
  advance(s.engine).endMainPhaseIfOpen(1);
  await opponentTurn;
  return outcome;
}

const tyrantOutcome = {
  attacked: true,
  suspended: true,
  hasCollision: false,
  forcedToBlock: false,
  declineBlockAccepted: false,
  defenderSecurityCount: 0,
};

const plainDigimonOutcome = {
  attacked: true,
  suspended: true,
  hasCollision: true,
  forcedToBlock: true,
  declineBlockAccepted: false,
  defenderSecurityCount: 1,
};

async function playCrimsonBlaze(s: EngineSetup): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimsonBlaze").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") && s.state.pendingDecision === undefined,
  );
  await drainMicrotasks();
}

describe("BT16-048 TyrantKabuterimon — KB Q&A rulings", () => {
  it("is not affected by a Security Digimon's [Security] effect while suspended (Q2640)", async () => {
    async function attackIntoDynasmon(attacker: string): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: attacker, as: "attacker", dp: 20_000 }] },
          1: { security: [{ card: "AD1-017", as: "dynasmon" }] },
        },
        { autoSelectCards: true },
      );
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("dynasmon").instanceId) &&
          !observe(s.engine).isAttacking(),
      );
      return s;
    }

    const tyrant = await attackIntoDynasmon("BT16-048");
    expect(tyrant.perm("attacker").isSuspended).toBe(true);
    expect(tyrant.perm("attacker").currentDP).toBe(20_000);
    expect(observe(tyrant.engine).hasKeyword(tyrant.perm("attacker"), "SecurityAttack")).toBe(false);

    const control = await attackIntoDynasmon("BT1-013");
    expect(control.perm("attacker").currentDP).toBe(17_000);
    expect(observe(control.engine).hasKeyword(control.perm("attacker"), "SecurityAttack")).toBe(true);
  });

  it("stops its [When Digivolving] play while the opponent's 'can't play Digimon by effects' applies (Q4661)", async () => {
    async function digivolveIntoTyrant(crimsonBlazeFirst: boolean): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: { battleArea: ["BT8-007"], hand: [{ card: "BT8-097", as: "crimsonBlaze" }] },
          1: {
            battleArea: [{ card: "BT16-045", as: "base" }],
            hand: [
              { card: "BT16-048", as: "tyrant" },
              { card: "BT16-042", as: "insectoid" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      if (crimsonBlazeFirst) await playCrimsonBlaze(s);

      s.state.turnSeat = 1;
      s.state.phase = Phase.Main;
      s.state.memory = 6;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("tyrant").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT16-048" && s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return s;
    }

    const handIds = (s: EngineSetup) => s.state.players[1]!.hand.map((card) => card.instanceId);

    const blazed = await digivolveIntoTyrant(true);
    expect(handIds(blazed)).toContain(blazed.inst("insectoid").instanceId);
    expect(blazed.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT16-048"]);

    const control = await digivolveIntoTyrant(false);
    expect(handIds(control)).not.toContain(control.inst("insectoid").instanceId);
    expect(control.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT16-042");
  });

  it("does not activate Regulusmon's granted Collision once its forced attack suspends it (Q5001)", async () => {
    expect(await forcedAttackOutcome("BT21-077", "BT16-048")).toEqual(tyrantOutcome);
    expect(await forcedAttackOutcome("BT21-077", "BT1-013")).toEqual(plainDigimonOutcome);
  });

  it("does not activate MetalGreymon's granted Collision once its forced attack suspends it (Q5015)", async () => {
    expect(await forcedAttackOutcome("EX10-008", "BT16-048")).toEqual(tyrantOutcome);
    expect(await forcedAttackOutcome("EX10-008", "BT1-013")).toEqual(plainDigimonOutcome);
  });
});
