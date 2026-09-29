import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  setupEngine,
  settle,
  type EngineSetup,
  type SeatSpec,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-074.js";
import "../index.js";

describe("BT16-074", () => {
  it("uses independent security branches and schedules the next-turn deletion", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      condition: { kind: "securityAtLeast", value: 3 },
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "Trash",
      target: { count: 1 },
      condition: { kind: "securityAtLeast", value: 3 },
    });
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      condition: { kind: "securityAtMost", value: 3 },
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "security", position: "top" } } },
    });
  });

  it("runs both security branches at exactly three during a legal alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-043", as: "source" }],
          hand: [{ card: "BT16-074", as: "climb" }, "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          trash: [{ card: "BT16-043", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("climb").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("source").topCard?.cardId === "BT16-074" &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-043"),
    );

    expect(s.perm("source").topCard?.cardId).toBe("BT16-074");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-043")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("naturally trashes exactly the top security card to unsuspend its Pulsemon-text host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-055", as: "host", under: ["BT16-074"] }],
          security: [
            { card: "BT1-001", as: "topSecurity" },
            { card: "BT1-002", as: "bottomSecurity" },
          ],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && s.state.players[0]!.security.length === 1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("topSecurity").instanceId)).toBe(true);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("bottomSecurity").instanceId);
  });
});

const FILLER_DECK = Array.from({ length: 12 }, () => "BT1-009");

async function digivolveIntoClimbmon(
  securityCount: number,
  opponent: SeatSpec = {},
  options: SetupEngineOptions = { autoAcceptOptional: true, autoSelectCards: true },
) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT16-043", as: "source" }],
        hand: [{ card: "BT16-074", as: "climb" }],
        deck: [...FILLER_DECK],
        security: Array.from({ length: securityCount }, () => "BT1-009"),
        trash: [{ card: "BT16-043", as: "revived" }],
      },
      1: { deck: [...FILLER_DECK], security: ["BT1-009", "BT1-009", "BT1-009"], ...opponent },
    },
    options,
  );
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  s.state.memory = 3;
  const handBefore = s.state.players[0]!.hand.length;
  const deckBefore = s.state.players[0]!.deck.length;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("source").permanentId,
      instanceId: s.inst("climb").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("source").topCard?.cardId === "BT16-074" && s.state.pendingDecision === undefined);
  return { s, loop, handBefore, deckBefore };
}

function revivedIsOnField(s: EngineSetup): boolean {
  const revivedId = s.inst("revived").instanceId;
  return s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId);
}

async function passTurn(s: EngineSetup, from: 0 | 1): Promise<void> {
  advance(s.engine).endMainPhaseIfOpen(from);
  await advance(s.engine).waitForMainPhase(from === 0 ? 1 : 0);
  await s.ready();
}

async function surrender(s: EngineSetup, loop: Promise<unknown>): Promise<void> {
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

async function endOpponentTurnWithKaguyamon(firstTriggerCardId: string) {
  const { s, loop } = await digivolveIntoClimbmon(
    3,
    { battleArea: [{ card: "EX9-033", as: "kaguyamon" }], trash: [{ card: "EX9-027", as: "kokeshimon" }] },
    { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [firstTriggerCardId] },
  );
  await passTurn(s, 0);
  advance(s.engine).endMainPhaseIfOpen(1);
  await advance(s.engine).waitForMainPhase(0);

  const offeredOrder = s.decisions.find((decision) => decision.req.kind === "orderTriggers" && decision.seat === 1);
  const revivedId = s.inst("revived").instanceId;
  const kokeshimonPlayedAt = s.events.findIndex(
    (event) => event.kind === "cardPlayed" && event.seat === 1 && event.cardId === "EX9-027",
  );
  const revivedDeletedAt = s.events.findIndex(
    (event) =>
      event.kind === "cardsMoved" &&
      (event.deletedPermanents ?? []).some((deleted) => deleted.instanceId === revivedId),
  );
  expect(revivedIsOnField(s)).toBe(false);
  await surrender(s, loop);
  return { offeredOrder, kokeshimonPlayedAt, revivedDeletedAt };
}

describe("BT16-074 Climbmon — KB Q&A rulings", () => {
  it("activates both the draw-and-trash and the Pulsemon play at exactly 3 security cards (Q2661)", async () => {
    const exactlyThree = await digivolveIntoClimbmon(3);
    const three = exactlyThree.s;

    expect(revivedIsOnField(three)).toBe(true);
    expect(exactlyThree.deckBefore - three.state.players[0]!.deck.length).toBe(3);
    expect(three.state.players[0]!.hand).toHaveLength(exactlyThree.handBefore - 1 + 3 - 1);
    expect(three.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    await surrender(three, exactlyThree.loop);

    const fourSecurity = await digivolveIntoClimbmon(4);
    const four = fourSecurity.s;

    expect(revivedIsOnField(four)).toBe(false);
    expect(fourSecurity.deckBefore - four.state.players[0]!.deck.length).toBe(3);

    const twoSecurity = await digivolveIntoClimbmon(2);
    const two = twoSecurity.s;

    expect(revivedIsOnField(two)).toBe(true);
    expect(twoSecurity.deckBefore - two.state.players[0]!.deck.length).toBe(1);
    await surrender(four, fourSecurity.loop);
    await surrender(two, twoSecurity.loop);
  });

  it("deletes the played Digimon only at the end of the opponent's first turn, never at a later one (Q5532)", async () => {
    const unprotected = await digivolveIntoClimbmon(3);
    expect(revivedIsOnField(unprotected.s)).toBe(true);
    await passTurn(unprotected.s, 0);
    expect(revivedIsOnField(unprotected.s)).toBe(true);
    await passTurn(unprotected.s, 1);
    expect(revivedIsOnField(unprotected.s)).toBe(false);
    await surrender(unprotected.s, unprotected.loop);

    const protectedOnce = await digivolveIntoClimbmon(3);
    const s = protectedOnce.s;
    await passTurn(s, 0);
    await advance(s.engine).verb.restrict(s.perm("revived").permanentId, "beDeleted", EffectDuration.UntilOwnerTurnEnd);
    await passTurn(s, 1);
    expect(revivedIsOnField(s)).toBe(true);
    await passTurn(s, 0);
    expect(observe(s.engine).hasRestriction(s.perm("revived"), "beDeleted")).toBe(false);
    await passTurn(s, 1);

    expect(revivedIsOnField(s)).toBe(true);
    await surrender(s, protectedOnce.loop);
  });

  it("lets the turn player order an end-of-turn trigger against this deletion (Q5533)", async () => {
    const kaguyamonFirst = await endOpponentTurnWithKaguyamon("EX9-033");

    expect(kaguyamonFirst.offeredOrder?.req.options?.triggerCardIds).toEqual(["EX9-033", "BT16-043"]);
    expect(kaguyamonFirst.offeredOrder?.req.options?.triggerDescriptions?.[1]).toMatch(/Delete this Digimon/);
    expect(kaguyamonFirst.kokeshimonPlayedAt).toBeGreaterThan(-1);
    expect(kaguyamonFirst.revivedDeletedAt).toBeGreaterThan(kaguyamonFirst.kokeshimonPlayedAt);

    const deletionFirst = await endOpponentTurnWithKaguyamon("BT16-043");

    expect(deletionFirst.offeredOrder?.req.options?.triggerCardIds).toEqual(["EX9-033", "BT16-043"]);
    expect(deletionFirst.revivedDeletedAt).toBeGreaterThan(-1);
    expect(deletionFirst.kokeshimonPlayedAt).toBeGreaterThan(deletionFirst.revivedDeletedAt);
  });
});
