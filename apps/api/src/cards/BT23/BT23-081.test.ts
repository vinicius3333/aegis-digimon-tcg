import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type BoardSpec, settle, settleAcrossTimers, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-081.js";

/** Reach seat 0's first production Main phase and report the memory the start-of-main window left. */
async function memoryAtOwnMain(board: BoardSpec): Promise<number> {
  const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  // A seeded breeding area keeps the production Breeding phase open until the turn player
  // skips it; an empty one auto-skips. Close it publicly so Main can open either way.
  await settleAcrossTimers(() => s.state.phase === Phase.Breeding || s.state.phase === Phase.Main);
  const skipped = s.state.phase === Phase.Breeding ? s.engine.applyIntent(0, { type: "endPhase" }) : { ok: true };
  expect(skipped).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const memory = s.state.memory;
  expect(s.state.pendingDecision).toBeUndefined();
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  return memory;
}

const NEUTRAL_HAND = { card: "ST1-02", as: "neutral" };

describe("BT23-081 Chitose Imai", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-081")).toMatchObject({
      cardId: "BT23-081",
      nameEn: "Chitose Imai",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      types: ["Hudie", "CS"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    // The catalog carries typographic spacing the official list uses; compare the printed
    // clauses on collapsed whitespace so a non-breaking space is not read as a text change.
    const printed = (getCardDefinition("BT23-081")?.effectText ?? "").replace(/\s+/g, " ").trim();
    expect(printed).toBe(
      "[Start of Your Main Phase] If you have a Digimon with the [CS] trait, gain 1 memory. " +
        "[On Play] You may play 1 play cost 5 or lower Digimon card with the [Hudie] trait from your hand without paying the cost. " +
        "[All Turns] When any of your [Hudie] trait Digimon suspend, by suspending this Tamer, 1 of your opponent's Digimon gets -3000 DP for the turn.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains exactly 1 memory at the production start of its controller's Main phase with a CS Digimon", async () => {
    const withCs = await memoryAtOwnMain({
      0: {
        battleArea: [
          { card: "BT23-081", as: "chitose" },
          { card: "BT23-037", as: "cs" },
        ],
        hand: [NEUTRAL_HAND],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011"], security: ["BT1-009", "BT1-010"] },
    });
    const withoutCs = await memoryAtOwnMain({
      0: {
        battleArea: [
          { card: "BT23-081", as: "chitose" },
          { card: "BT1-028", as: "plain" },
        ],
        hand: [NEUTRAL_HAND],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011"], security: ["BT1-009", "BT1-010"] },
    });

    expect(withCs).toBe(withoutCs + 1);
  });

  it("ignores a CS Digimon that is only in the breeding area", async () => {
    // Comprehensive rules 3-4-5-8: breeding-area cards are not referenced unless the
    // effect names the breeding area, so "if you have a Digimon with the [CS] trait"
    // reads the battle area only.
    const breedingOnly = await memoryAtOwnMain({
      0: {
        battleArea: [{ card: "BT23-081", as: "chitose" }],
        breeding: { card: "BT23-037", as: "csEgg" },
        hand: [NEUTRAL_HAND],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011"], security: ["BT1-009", "BT1-010"] },
    });
    const empty = await memoryAtOwnMain({
      0: {
        battleArea: [{ card: "BT23-081", as: "chitose" }],
        hand: [NEUTRAL_HAND],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011"], security: ["BT1-009", "BT1-010"] },
    });

    expect(breedingOnly).toBe(empty);
  });

  it("publicly plays for 4 and free-plays exactly one cost-5-or-lower Hudie Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT23-037", as: "hudieCheap" },
            { card: "BT23-032", as: "hudieExpensive" },
            { card: "BT1-028", as: "plain" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const chitoseId = s.inst("chitose").instanceId;
    const cheapId = s.inst("hudieCheap").instanceId;
    const expensiveId = s.inst("hudieExpensive").instanceId;
    const plainId = s.inst("plain").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: chitoseId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === cheapId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === chitoseId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === cheapId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual([expensiveId, plainId].sort());
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("may decline the On Play free play and leave every eligible Hudie in hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT23-037", as: "hudieCheap" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const chitoseId = s.inst("chitose").instanceId;
    const cheapId = s.inst("hudieCheap").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: chitoseId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === chitoseId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([cheapId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("suspends this Tamer on a public Hudie attack to give one opposing Digimon -3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT23-037", as: "hudie" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target", suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(s.perm("target").currentDP).toBe(10000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chitose").isSuspended === true && s.perm("target").currentDP === 7000);

    expect(s.perm("chitose").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === targetId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("may decline the suspension cost and leave both the Tamer and the opposing DP untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT23-037", as: "hudie" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target", suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking() === false);

    expect(s.perm("chitose").isSuspended).toBe(false);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not trigger when a non-Hudie Digimon of the same controller suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT1-028", as: "plain" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target", suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking() === false);

    expect(s.perm("chitose").isSuspended).toBe(false);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot pay the cost when this Tamer is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-081", as: "chitose", suspended: true },
            { card: "BT23-037", as: "hudie" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target", suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking() === false);

    expect(s.perm("chitose").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("expires the -3000 DP at the real turn boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT23-037", as: "hudie" },
          ],
          hand: [NEUTRAL_HAND],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target", suspended: true }],
          hand: [{ card: "ST1-02", as: "neutralOpponent" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 7000);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.perm("chitose").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === targetId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself from security without paying its 4 cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: [{ card: "BT23-081", as: "securityChitose" }, "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const chitoseId = s.inst("securityChitose").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === chitoseId));

    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === chitoseId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === chitoseId)).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).not.toContain(chitoseId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("compiles all four printed clauses into the expected IR", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "youHave",
        filter: { kind: ["Digimon"], zone: "battleArea", nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
      },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        filter: { kind: ["Digimon"], playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] },
      },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }],
      },
      actions: [
        {
          kind: "ModifyDP",
          amount: -3000,
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          cost: { kind: "suspend", target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isSecurity === true)).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true, filter: { isSelfRef: true } } }],
    });
  });
});
