import { describe, expect, it } from "vitest";
import { setupEngine, settle, type BoardSpec, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-111.js";
import "./BT5-086.js";
import "../AD1/AD1-005.js";
import "../BT1/BT1-031.js";
import "../BT10/BT10-085.js";
import "../BT13/BT13-019.js";
import "../BT15/BT15-047.js";
import "../EX1/EX1-062.js";

describe("BT5-111 Omnimon X Antibody", () => {
  it("digivolves over an Omnimon in the battle area for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-086", as: "base" }],
        hand: [{ card: "BT5-111", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-111");

    expect(s.state.memory).toBe(0);
  });

  it("Q1385 rejects the Omnimon shortcut in the breeding area", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT5-086", as: "base" },
        hand: [{ card: "BT5-111", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("requires the alternate shortcut's Omnimon name gate", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-082", as: "base" }],
        hand: [{ card: "BT5-111", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("carries the battle-area-only gate on the registered shortcut requirement", () => {
    expect(runtimeCompiledCard("BT5-111")?.digivolutionRequirement).toContainEqual({
      names: ["Omnimon"],
      cost: 3,
      isAlternate: true,
      battleAreaOnly: true,
    });
  });

  it("deletes an opposing Digimon with DP at most its own when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-111", as: "omni" }] },
        1: {
          battleArea: [
            { card: "BT4-073", as: "target", dp: 15000 },
            { card: "BT4-073", as: "safe", dp: 15001 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omni").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT4-073")).toBe(true);
  });

  it("trashes 2 of its sources to end an opponent's attack before the security check", async () => {
    const preferredSourceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT5-111",
              as: "omni",
              under: [
                { card: "BT5-014", as: "sourceA" },
                { card: "BT5-019", as: "sourceB" },
                { card: "BT5-086", as: "sourceC" },
              ],
            },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredSourceIds },
    );
    preferredSourceIds.push(s.inst("sourceA").instanceId, s.inst("sourceB").instanceId);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("omni").stack.length === 1);

    expect(s.state.players[0]?.security).toHaveLength(1);
    expect(s.state.players[0]?.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("sourceA").instanceId, s.inst("sourceB").instanceId]),
    );
    expect(s.state.players[0]?.trash.map((card) => card.instanceId)).not.toContain(s.inst("sourceC").instanceId);
    expect(s.perm("omni").stack.map((card) => card.instanceId)).toEqual([s.inst("sourceC").instanceId]);
  });

  it("may decline ending an opponent's attack while keeping its sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-111", as: "omni", under: ["BT5-014", "BT5-019", "BT5-086"] }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT5-059", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-111")).toBe(true);
    expect(s.perm("omni").stack).toHaveLength(3);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toEqual(
      expect.arrayContaining(["BT5-014", "BT5-019", "BT5-086"]),
    );
  });

  it("does not end the attack when only one source remains", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-111", as: "omni", under: ["BT5-086"] }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("omni").stack).toHaveLength(1);
  });
});

describe("BT5-111 Omnimon X (Anti-body) — KB Q&A rulings", () => {
  async function opponentAttacks(
    board: BoardSpec,
    options: SetupEngineOptions,
  ): Promise<ReturnType<typeof setupEngine>> {
    const s = setupEngine(board, options);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    return s;
  }

  const eventKinds = (s: ReturnType<typeof setupEngine>) => s.events.map((event) => event.kind);

  it("a digivolve effect can use the Omnimon shortcut to digivolve a battle-area Omnimon into this card (Q1386)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-086", as: "omni" }],
          hand: [
            { card: "BT10-085", as: "ciel" },
            { card: "BT5-111", as: "evolving" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, declineDigiXros: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ciel").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("omni").topCard.cardId === "BT5-111");

    expect(s.perm("omni").topCard.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.perm("omni").stack.map((card) => card.cardId)).toContain("BT5-086");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("evolving").instanceId);
    const sistermonPlayCost = 4;
    const omnimonShortcutCost = 3;
    const sistermonRoyalKnightMemory = 1;
    expect(s.state.memory).toBe(10 - sistermonPlayCost - omnimonShortcutCost + sistermonRoyalKnightMemory);
  });

  it("cannot end the attack by trashing only 1 digivolution card (Q1387)", async () => {
    const s = await opponentAttacks(
      {
        0: {
          battleArea: [{ card: "BT5-111", as: "omni", under: [{ card: "BT5-086", as: "onlySource" }] }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("omni").stack.map((card) => card.instanceId)).toEqual([s.inst("onlySource").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("onlySource").instanceId);
  });

  it("ending the attack skips counter and block timing and the attack does not succeed (Q1388)", async () => {
    const board: BoardSpec = {
      0: {
        battleArea: [
          { card: "BT5-111", as: "omni", under: ["BT5-014", "BT5-019"] },
          { card: "BT1-031", as: "blocker" },
          { card: "BT1-021", as: "blastBase" },
        ],
        hand: [{ card: "AD1-005", as: "blastCounter" }],
        security: [{ card: "BT1-009", as: "security" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    };

    const ended = await opponentAttacks(board, { autoAcceptOptional: true, autoSelectCards: true });
    expect(ended.perm("omni").stack).toHaveLength(0);
    expect(eventKinds(ended)).not.toContain("counterWindowOpened");
    expect(eventKinds(ended)).not.toContain("blockWindowOpened");
    expect(eventKinds(ended)).not.toContain("combatResolved");
    expect(ended.perm("blocker").isSuspended).toBe(false);
    expect(ended.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      ended.inst("security").instanceId,
    ]);

    const continued = setupEngine(board, { autoDeclineOptional: true, autoSelectCards: true });
    continued.state.turnSeat = 1;
    await continued.engine.recomputeContinuousEffects();
    expect(
      continued.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: continued.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => eventKinds(continued).includes("counterWindowOpened"));
    expect(continued.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => eventKinds(continued).includes("blockWindowOpened"));
    expect(continued.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(continued.engine).isAttacking());
    expect(continued.perm("omni").stack).toHaveLength(2);
    expect(continued.state.players[0]!.security).toHaveLength(0);
  });

  it("ends the attack of a Digimon that is not affected by the opponent's Digimon effects (Q1389)", async () => {
    const s = await opponentAttacks(
      {
        0: {
          battleArea: [{ card: "BT5-111", as: "omni", under: ["BT5-014", "BT5-019"] }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT15-047", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("attacker"), "beAffected", "Digimon")).toBe(true);
    expect(s.perm("omni").stack).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(eventKinds(s)).not.toContain("combatResolved");
  });

  it("the attacker's [End of Attack] effect still activates after this card ends the attack (Q1390)", async () => {
    const s = await opponentAttacks(
      {
        0: {
          battleArea: [{ card: "BT5-111", as: "omni", under: ["BT5-014", "BT5-019"] }],
          security: [{ card: "BT1-009", as: "security" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "EX1-062", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX1-062"));

    expect(s.perm("omni").stack).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX1-062")).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("EX1-062");
  });

  it("[Gankoomon]'s effect can play this card from the digivolution cards of a breeding-area Digimon (Q2277)", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-019", as: "gankoomon" }],
          breeding: {
            card: "BT1-009",
            as: "hatchling",
            under: [
              { card: "BT5-086", as: "plainOmnimon" },
              { card: "BT10-086", as: "omnimonXAntibody" },
              { card: "BT10-068", as: "gankoomonXAntibody" },
              { card: "BT5-111", as: "omnimonX" },
            ],
          },
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declineDigiXros: true,
        preferInstanceIds: preferredInstanceIds,
      },
    );
    preferredInstanceIds.push(s.inst("omnimonX").instanceId);
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-111"));

    const playChoice = s.decisions.find((decision) =>
      decision.req.options?.candidateInstanceIds?.includes(s.inst("omnimonX").instanceId),
    );
    expect(playChoice?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("omnimonXAntibody").instanceId, s.inst("gankoomonXAntibody").instanceId]),
    );
    expect(playChoice?.req.options?.candidateInstanceIds).not.toContain(s.inst("plainOmnimon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
