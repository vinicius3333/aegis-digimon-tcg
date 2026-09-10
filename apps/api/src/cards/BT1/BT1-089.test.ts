import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
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
