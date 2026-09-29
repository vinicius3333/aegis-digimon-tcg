import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-007.js";
import "./BT13-110.js";
import "../EX13/EX13-014.js";

async function playFromHand(s: ReturnType<typeof setupEngine>, alias: string, battleAreaSize: number): Promise<number> {
  const memoryBefore = s.state.memory;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.length === battleAreaSize);
  return memoryBefore - s.state.memory;
}

async function passToNextOwnMain(
  s: ReturnType<typeof setupEngine>,
  ownTurnInFlight: Promise<void>,
  memory: number,
): Promise<{ ownTurn: Promise<void> }> {
  const turns = advance(s.engine);
  turns.endMainPhaseIfOpen(0);
  await ownTurnInFlight;
  s.state.turnSeat = 1;
  s.state.memory = 0;
  const opponentTurn = s.engine.runOneTurn();
  await turns.waitForMainPhase(1);
  turns.endMainPhaseIfOpen(1);
  await opponentTurn;
  s.state.turnSeat = 0;
  s.state.memory = memory;
  const ownTurn = s.engine.runOneTurn();
  await turns.waitForMainPhase(0);
  return { ownTurn };
}

describe("BT13-007 King Drasil_7D6", () => {
  it("prevents its controller's Digimon from digivolving while it is in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-045", as: "base" }],
        hand: [{ card: "BT18-036", as: "evolver" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.cardId).toBe("BT1-045");
  });

  it("reduces one Royal Knight play by 4 plus its source count, then spends the once-per-turn budget", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil", under: ["BT1-001", "BT1-002"] },
          hand: [
            { card: "BT13-040", as: "firstKnight" },
            { card: "BT13-040", as: "secondKnight" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(2);
  });

  it("may decline the Royal Knight play-cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil", under: ["BT1-001", "BT1-002"] },
          hand: [{ card: "BT13-040", as: "knight" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(3);
  });

  it("must place the top Digi-Egg and every battle-area Royal Knight under itself at Start of Main", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          eggDeck: [{ card: "BT1-001", as: "egg" }],
          battleArea: [
            { card: "AD1-008", as: "knight" },
            { card: "BT1-015", as: "nonKnight" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const eggId = s.inst("egg").instanceId;
    const knightId = s.perm("knight").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("drasil"));
    await settle(() => s.perm("drasil").stack.some((card) => card.instanceId === eggId));

    expect(s.perm("drasil").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([eggId, knightId]));
    expect(s.perm("drasil").stack.find((card) => card.instanceId === eggId)?.faceUp).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("nonKnight").permanentId,
    ]);
  });

  it("gains memory only once when Royal Knight Options enter battle with King Drasil inherited", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "host", under: ["BT13-007"] },
          hand: [
            { card: "BT13-110", as: "firstOption" },
            { card: "BT13-110", as: "secondOption" },
          ],
          deck: ["BT1-010", "BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-110"));
    await settle();
    expect(s.state.memory).toBe(5);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT13-110").length === 2,
    );
    expect(s.state.memory).toBe(-1);
  });

  it("resets the Royal Knight play reduction on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil", under: ["BT1-001"] },
          hand: [
            { card: "BT13-040", as: "firstKnight" },
            { card: "BT13-040", as: "sameTurnKnight" },
            { card: "BT13-040", as: "nextTurnKnight" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { hand: ["BT13-021"], deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    const initialOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sameTurnKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await initialOwnTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // Start of Main placed both Magnamon under King Drasil: 3 sources reduce the 7 cost to 0.
    expect(s.perm("drasil").stack).toHaveLength(3);
    const memoryBeforeNextKnight = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nextTurnKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(memoryBeforeNextKnight);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("resets the inherited Royal Knight Option memory trigger on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "host", under: ["BT13-007"] },
          hand: [
            { card: "BT13-110", as: "firstOption" },
            { card: "BT13-110", as: "sameTurnOption" },
            { card: "BT13-110", as: "nextTurnOption" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { hand: ["BT13-021"], deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    const initialOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(5);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sameTurnOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(-1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await initialOwnTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const memoryBeforeNextOption = s.state.memory;
    expect(memoryBeforeNextOption).toBe(3);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nextTurnOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(memoryBeforeNextOption - 5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  // Discord bug 1554297556551340062, match dd487753-8aff-4566-ae00-154cddc7dfe3: an earlier
  // payment window left the reducer registered with its old source count.
  it("counts both same-name Digi-Egg sources after an earlier play registered the reducer", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          eggDeck: ["BT13-007", "BT13-007"],
          hand: [
            { card: "BT1-010", as: "filler" },
            { card: "EX13-014", as: "jesmon" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("drasil").stack).toHaveLength(1);
    expect(await playFromHand(s, "filler", 1)).toBe(3);
    const { ownTurn: secondTurn } = await passToNextOwnMain(s, firstTurn, 10);

    expect(s.perm("drasil").stack.map((card) => card.cardId)).toEqual(["BT13-007", "BT13-007"]);
    expect(await playFromHand(s, "jesmon", 2)).toBe(6);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });

  it("counts three King Drasil eggs and a Royal Knight source after an earlier reduced play", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil", under: ["BT13-007"] },
          eggDeck: ["BT13-007", "BT13-007"],
          hand: [
            { card: "EX13-014", as: "firstJesmon" },
            { card: "BT1-010", as: "filler" },
            { card: "EX13-014", as: "secondJesmon" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("drasil").stack).toHaveLength(2);
    expect(await playFromHand(s, "firstJesmon", 1)).toBe(6);
    expect(await playFromHand(s, "filler", 2)).toBe(3);
    const { ownTurn: secondTurn } = await passToNextOwnMain(s, firstTurn, 10);

    expect(
      s
        .perm("drasil")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT13-007", "BT13-007", "BT13-007", "EX13-014"]);
    expect(await playFromHand(s, "secondJesmon", 2)).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
