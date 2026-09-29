import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-056.js";

describe("BT15-056", () => {
  it("matches the catalog identity and black/green level-3 evolution routes", () => {
    expect(getCardDefinition("BT15-056")).toMatchObject({
      nameEn: "Ryudamon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
      types: ["Beast", "X Antibody", "DigiPolice"],
    });
  });

  it("may place Shuu Yulin under itself to become immune to opponent Digimon effects", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", cost: { kind: "place" }, optional: true },
      ],
    }));
  it("once per turn suspends an opposing Digimon or Tamer with play cost no greater than this Digimon", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Suspend", target: { filter: { playCostLteTriggerSource: true } } }],
        },
      ],
    }));

  it("naturally places Shuu Yulin at the start of its main phase and gains opponent-Digimon immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-056", as: "ryudamon" }],
          hand: [{ card: "BT15-087", as: "shuu" }],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("ryudamon").stack.some(({ cardId }) => cardId === "BT15-087"));

    expect(s.perm("ryudamon").stack.map(({ cardId }) => cardId)).toContain("BT15-087");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ryudamon"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("naturally triggers once when the host becomes suspended and respects its play-cost ceiling", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-058", as: "host", under: ["BT15-056"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-019", as: "high" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );

    preferInstanceIds.push(s.perm("low").topCard!.instanceId);
    s.state.memory = 3;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("low").isSuspended &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.security.length === 4,
    );

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.security.length === 3,
    );
    expect(s.perm("high").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([
      s.perm("host").permanentId,
      s.perm("low").permanentId,
      s.perm("high").permanentId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("low").isSuspended &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.security.length === 2,
    );
    expect(s.perm("low").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

async function attackIntoSecurityHuckmon(placeShuuYulin: boolean) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT15-056", as: "ryudamon" },
          { card: "BT1-019", as: "attacker" },
        ],
        hand: [{ card: "BT15-087", as: "shuu" }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { security: [{ card: "P-066", as: "huckmon" }], deck: ["BT1-009"] },
    },
    placeShuuYulin
      ? { autoAcceptOptional: true, autoSelectCards: true }
      : { autoDeclineOptional: true, autoSelectCards: true },
  );

  await s.ready();
  s.state.memory = 3;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.perm("ryudamon").stack.some(({ cardId }) => cardId === "BT15-087")).toBe(placeShuuYulin);
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
  const result = {
    ryudamonOnField: s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-056"),
    opponentHand: s.state.players[1]!.hand.map(({ cardId }) => cardId).sort(),
  };
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  return result;
}

describe("BT15-056 Ryudamon — KB Q&A rulings", () => {
  it("is not affected by the [Security] effect of an opponent's Security Digimon after placing Shuu Yulin under itself (Q2541)", async () => {
    const protectedRyudamon = await attackIntoSecurityHuckmon(true);
    expect(protectedRyudamon.ryudamonOnField).toBe(true);
    expect(protectedRyudamon.opponentHand).toEqual(["BT1-009", "P-066"]);

    const unprotectedRyudamon = await attackIntoSecurityHuckmon(false);
    expect(unprotectedRyudamon.ryudamonOnField).toBe(false);
    expect(unprotectedRyudamon.opponentHand).toEqual(["P-066"]);
  });
});
