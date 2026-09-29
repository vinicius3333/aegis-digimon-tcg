import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-099.js";
import "../BT3/BT3-105.js";
import "../BT8/BT8-094.js";
import "../BT9/BT9-047.js";
import "../P/P-143.js";
import "../ST10/ST10-06.js";
import "../ST2/ST2-12.js";
import "./BT1-047.js";
import "./BT1-056.js";
import "./BT1-031.js";
import "./BT1-089.js";

function mainEffectKey(s: EngineSetup, alias: string): string {
  const entries = JSON.parse(s.perm(alias).activatableEffectsJson || "[]") as { effectKey: string }[];
  expect(entries).toHaveLength(1);
  return entries[0]!.effectKey;
}

function activateMain(s: EngineSetup, alias: string) {
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm(alias).topCard!.instanceId,
    effectKey: mainEffectKey(s, alias),
  });
}

describe("BT1-089 Mimi Tachikawa", () => {
  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-089", as: "mimi" }, "BT1-012"] } });
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("sets memory while suspended (Q958), but not above 2 memory or on the opponent's turn", async () => {
    const suspended = setupEngine({
      0: { battleArea: [{ card: "BT1-089", as: "mimi", suspended: true }, "BT1-012"] },
    });
    suspended.state.memory = 2;
    const suspendedTurn = suspended.engine.runOneTurn();
    await advance(suspended.engine).waitForMainPhase(0);
    expect(suspended.state.memory).toBe(3);
    advance(suspended.engine).endMainPhaseIfOpen(0);
    await suspendedTurn;

    const aboveTwo = setupEngine({ 0: { battleArea: [{ card: "BT1-089", as: "mimi" }, "BT1-012"] } });
    aboveTwo.state.memory = 4;
    const aboveTwoTurn = aboveTwo.engine.runOneTurn();
    await advance(aboveTwo.engine).waitForMainPhase(0);
    expect(aboveTwo.state.memory).toBe(4);
    advance(aboveTwo.engine).endMainPhaseIfOpen(0);
    await aboveTwoTurn;

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT1-089", as: "mimi" }] },
      1: { hand: ["BT1-090"] },
    });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 0;
    const opponentTurnRun = opponentTurn.engine.runOneTurn();
    await advance(opponentTurn.engine).waitForMainPhase(1);
    expect(opponentTurn.state.memory).toBe(0);
    advance(opponentTurn.engine).endMainPhaseIfOpen(1);
    await opponentTurnRun;
  });

  it("suspends to hatch when a level 5 green Digimon is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-089", as: "mimi" },
            { card: "BT1-078", under: ["BT1-073"] },
          ],
          eggDeck: ["BT1-008"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    await s.ready();
    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-008");
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-008");
    expect(s.perm("mimi").isSuspended).toBe(true);
  });

  it("can decline the optional breeding-area action", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-089", as: "mimi" },
            { card: "BT1-078", under: ["BT1-073"] },
          ],
          eggDeck: ["BT1-008"],
        },
      },
      { autoAcceptOptional: false },
    );

    await s.ready();
    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "BT1-089" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("mimi").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
  });

  it.each<[string, { breeding?: string; battleArea?: string[] }]>([
    ["no available breeding action", {}],
    ["only a level 2 in breeding", { breeding: "BT1-008" }],
    ["a qualifying Digimon only in breeding (Q957)", { breeding: "BT1-078", battleArea: [] }],
  ])("does not suspend with %s", async (_label, extra) => {
    const qualifyingBattleArea = "battleArea" in extra ? extra.battleArea : ["BT1-078"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, ...(qualifyingBattleArea ?? [])],
          breeding: extra.breeding,
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );

    await s.ready();
    expect(JSON.parse(s.perm("mimi").activatableEffectsJson || "[]")).toHaveLength(0);

    expect(s.perm("mimi").isSuspended).toBe(false);
  });

  it("suspends to move a level 3 Digimon from breeding to the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, { card: "BT1-078" }],
          breeding: { card: "BT1-064", as: "raised" },
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const raisedId = s.perm("raised").topCard!.instanceId;
    await s.ready();
    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === raisedId)).toBe(true);
    expect(s.perm("mimi").isSuspended).toBe(true);
    expect(s.perm("raised").enterFieldTurnCount).not.toBe(s.state.turnCount);
    expect(s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT1-064")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raised").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("uses a qualifying level 5 reached through a legal hatch/evolution/move lifecycle", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-008", as: "egg" }, "BT1-007"],
          battleArea: [{ card: "BT1-089", as: "mimi" }],
          hand: [
            { card: "BT1-064", as: "lv3" },
            { card: "BT1-073", as: "lv4" },
            { card: "BT1-078", as: "lv5" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-009"],
          security: ["BT1-009", "BT1-012", "BT1-013", "BT1-009", "BT1-012"],
        },
        1: {
          deck: ["BT1-009", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-012", "BT1-013", "BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("egg").instanceId);
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    for (const name of ["lv3", "lv4", "lv5"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: breedingPermanentId,
          instanceId: s.inst(name).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst(name).instanceId);
    }
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT1-008", "BT1-064", "BT1-073"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === breedingPermanentId));

    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-007");
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === breedingPermanentId)?.topCard?.cardId).toBe(
      "BT1-078",
    );
    expect(s.perm("mimi").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-012", as: "attacker", dp: 20000 }] },
      1: { security: [{ card: "BT1-089", as: "securityMimi" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityMimi").instanceId,
      ),
    );

    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityMimi").instanceId,
      ),
    ).toBe(true);
  });
});

describe("BT1-089 Mimi Tachikawa — KB Q&A rulings", () => {
  it("moving a Digimon from breeding does not trigger Mastemon's play-by-effect [All Turns] (Q736)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, { card: "ST10-06", as: "mastemon" }, "BT1-078"],
          breeding: { card: "BT1-064", as: "raised" },
          hand: [
            { card: "BT1-056", as: "player" },
            { card: "BT1-047", as: "tinkermon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstVictim" },
            { card: "BT1-013", as: "secondVictim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();

    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("raised").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("player").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length < 2 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tinkermon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("resolves alongside Matt Ishida in either order, reaching 4 memory when Mimi goes first (Q955)", async () => {
    async function startTurnAtOneMemory(firstTrigger: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-089", as: "mimi" },
              { card: "ST2-12", as: "matt" },
            ],
          },
          1: { battleArea: ["BT1-013"] },
        },
        { preferTriggerKeys: [firstTrigger] },
      );
      s.state.memory = 1;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      const memory = s.state.memory;
      const orderRequest = s.decisions.find((decision) => decision.req.kind === "orderTriggers");
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      return { memory, orderedCardIds: orderRequest?.req.options?.triggerCardIds ?? [] };
    }

    const mimiFirst = await startTurnAtOneMemory("BT1-089");
    expect(mimiFirst.orderedCardIds).toEqual(expect.arrayContaining(["BT1-089", "ST2-12"]));
    expect(mimiFirst.memory).toBe(4);

    const mattFirst = await startTurnAtOneMemory("ST2-12");
    expect(mattFirst.orderedCardIds).toEqual(expect.arrayContaining(["BT1-089", "ST2-12"]));
    expect(mattFirst.memory).toBe(3);
  });

  it("[Main] can be activated in the main phase but not to interrupt an attack (Q956)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, "BT1-078", { card: "BT1-012", as: "attacker" }],
          breeding: "BT1-064",
        },
        1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-009", "BT1-012"] },
      },
      { autoAcceptOptional: true, preferOptionIndex: 1 },
    );
    await s.ready();
    const mainKey = mainEffectKey(s, "mimi");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mimi").topCard!.instanceId,
        effectKey: mainKey,
      }).ok,
    ).toBe(false);
    expect(s.perm("mimi").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-064");

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.pendingDecision === undefined);
    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);
    expect(s.perm("mimi").isSuspended).toBe(true);
  });

  it("does not count a level 5 green Digimon in the breeding area for its [Main] effect (Q957)", async () => {
    const onlyInBreeding = setupEngine({
      0: { battleArea: [{ card: "BT1-089", as: "mimi" }], breeding: "BT1-078" },
    });
    await onlyInBreeding.ready();
    expect(JSON.parse(onlyInBreeding.perm("mimi").activatableEffectsJson || "[]")).toHaveLength(0);

    const alsoInBattle = setupEngine({
      0: { battleArea: [{ card: "BT1-089", as: "mimi" }, "BT1-078"], breeding: "BT1-078" },
    });
    await alsoInBattle.ready();
    expect(JSON.parse(alsoInBattle.perm("mimi").activatableEffectsJson || "[]")).toHaveLength(1);
  });

  it("a Digimon hatched and digivolved this turn can attack right after Mimi moves it (Q959)", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-008", as: "egg" }],
          battleArea: [{ card: "BT1-089", as: "mimi" }, "BT1-078"],
          hand: [
            { card: "BT1-064", as: "lv3" },
            { card: "BT1-012", as: "playedFromHand" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-009"],
          security: ["BT1-009", "BT1-012", "BT1-013", "BT1-009", "BT1-012"],
        },
        1: {
          deck: ["BT1-009", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-012", "BT1-013", "BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("egg").instanceId);
    const hatchedPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hatchedPermanentId,
        instanceId: s.inst("lv3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("lv3").instanceId);

    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === hatchedPermanentId));

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedFromHand").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-012"));
    const playedPermanentId = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT1-012")!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: playedPermanentId, target: { kind: "player" } })
        .ok,
    ).toBe(false);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hatchedPermanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("a Digimon moved from breeding after Breath of the Gods' security effect cannot attack players (Q1142)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-089", as: "mimi" },
            { card: "BT1-078", as: "presentBeforeSecurity" },
            { card: "BT1-012", as: "attacker", dp: 20000 },
          ],
          breeding: { card: "BT1-064", as: "raised" },
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "restingTarget", suspended: true }],
          security: [{ card: "BT3-105", as: "breath" }, "BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
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
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("breath").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("presentBeforeSecurity").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);

    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
    const raisedId = s.perm("raised").permanentId;
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === raisedId)).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: raisedId, target: { kind: "player" } }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: raisedId,
        target: { kind: "permanent", permanentId: s.perm("restingTarget").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("Digimon Emperor's owner gains 2 memory when Mimi moves a level 3 Digimon out of breeding (Q1769)", async () => {
    async function memoryAfterMimiMoves(breedingCardId: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-089", as: "mimi" }, "BT1-078"],
            breeding: { card: breedingCardId, as: "raised" },
          },
          1: { battleArea: [{ card: "BT8-094", as: "emperor" }] },
        },
        { autoAcceptOptional: true, preferOptionIndex: 1 },
      );
      await s.ready();
      s.state.memory = 5;

      expect(activateMain(s, "mimi")).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("raised").permanentId)).toBe(true);
      return s.state.memory;
    }

    expect(await memoryAfterMimiMoves("BT1-064")).toBe(3);
    expect(await memoryAfterMimiMoves("BT1-073")).toBe(5);
  });

  it("can move a Digimon out of breeding while Pomumon forbids playing Digimon by effects (Q1844)", async () => {
    async function moveThenTryEffectPlay(opponentBattleArea: string[]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-089", as: "mimi" }, "BT1-078"],
            breeding: { card: "BT1-064", as: "raised" },
            hand: [
              { card: "BT1-056", as: "player" },
              { card: "BT1-047", as: "tinkermon" },
            ],
          },
          1: { battleArea: opponentBattleArea },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
      );
      s.state.memory = 10;
      await s.ready();

      expect(activateMain(s, "mimi")).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
      const moved = s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("raised").permanentId);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("player").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("player").instanceId)).toBe(
        true,
      );
      const playedByEffect = s.state.players[0]!.battleArea.some(
        (p) => p.topCard?.instanceId === s.inst("tinkermon").instanceId,
      );
      return { moved, playedByEffect };
    }

    expect(await moveThenTryEffectPlay(["BT9-047"])).toEqual({ moved: true, playedByEffect: false });
    expect(await moveThenTryEffectPlay(["BT1-013"])).toEqual({ moved: true, playedByEffect: true });
  });

  it("a Digimon that returns from breeding is affected again by the Security Attack -1 it was given (Q4252)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-143", as: "drimogemon" },
            { card: "BT1-089", as: "mimi" },
            "BT1-078",
            { card: "BT1-012", as: "control", dp: 20000 },
          ],
        },
        1: {
          security: [{ card: "BT10-099", as: "sirens" }, "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();
    const drimogemonId = s.perm("drimogemon").permanentId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("sirens"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).keywordAmount(drimogemonId, "SecurityAttack")).toBe(-1);

    // Drimogemon's own [End of Your Turn] move is fired inside Main so Mimi's [Main] can return it this turn.
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("drimogemon"));
    await settle(() => s.state.players[0]!.breeding?.permanentId === drimogemonId);
    expect(s.state.players[0]!.breeding?.permanentId).toBe(drimogemonId);

    expect(activateMain(s, "mimi")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === drimogemonId)).toBe(true);
    expect(observe(s.engine).keywordAmount(drimogemonId, "SecurityAttack")).toBe(-1);

    const securityBefore = s.state.players[1]!.security.length;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: drimogemonId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(s.state.players[1]!.security).toHaveLength(securityBefore);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("control").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
  });

  it("a Drimogemon returned by Mimi cannot use its [Once Per Turn] [End of Your Turn] effect again (Q4253)", async () => {
    async function breedingAfterTurnEnd(activatedBeforeReturn: boolean) {
      const drimogemon = { card: "P-143", as: "drimogemon" };
      const mimiBoard = [{ card: "BT1-089", as: "mimi" }, "BT1-078"];
      const s = setupEngine(
        {
          0: activatedBeforeReturn
            ? { battleArea: [drimogemon, ...mimiBoard] }
            : { battleArea: mimiBoard, breeding: drimogemon },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
      );
      const drimogemonId = s.perm("drimogemon").permanentId;
      const turn = s.engine.runOneTurn();
      if (!activatedBeforeReturn) {
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
        s.engine.applyIntent(0, { type: "endPhase" });
      }
      await advance(s.engine).waitForMainPhase(0);

      if (activatedBeforeReturn) {
        // Its [End of Your Turn] is fired inside Main so Mimi's [Main] can bring it back before the real turn end.
        await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("drimogemon"));
        await settle(() => s.state.players[0]!.breeding?.permanentId === drimogemonId);
      }
      expect(activateMain(s, "mimi")).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === drimogemonId)).toBe(true);

      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      return { drimogemonId, breedingId: s.state.players[0]!.breeding?.permanentId };
    }

    const alreadyActivated = await breedingAfterTurnEnd(true);
    expect(alreadyActivated.breedingId).toBeUndefined();

    const notYetActivated = await breedingAfterTurnEnd(false);
    expect(notYetActivated.breedingId).toBe(notYetActivated.drimogemonId);
  });
});
