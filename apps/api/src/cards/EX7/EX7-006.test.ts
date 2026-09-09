import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-006.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function attackPlayer(s: ReturnType<typeof setupEngine>, alias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "player" },
  });
}

async function finishTurnLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-006 Yaamon", () => {
  it("compiles the inherited optional paid once-per-turn trash evolution", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          optional: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 4,
            raw: "you have 4 or fewer cards in your hand",
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("hatches, zero-cost digivolves, moves, then uses Yaamon from the preserved stack", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX7-006", as: "egg" }],
          hand: [{ card: "BT11-075", as: "evolver" }],
          trash: [{ card: "BT11-079", as: "candidate" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX7-006");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    const deckBeforeDigivolve = s.state.players[0]!.deck.length;
    const bonusDrawInstanceId = s.state.players[0]!.deck[0]!.instanceId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT11-075");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeDigivolve - 1);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === bonusDrawInstanceId)).toBe(true);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard?.cardId).toBe("BT11-075");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => carrier.topCard?.cardId === "BT11-079");
    expect(s.state.memory).toBe(3);
    expect(carrier.stack.map(({ cardId }) => cardId)).toEqual(["EX7-006", "BT11-075"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    await finishTurnLoop(s, loop);
  });

  it("pays the printed cost once, refuses a same-turn re-use, and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009", "BT1-009"],
          trash: ["BT11-079", "BT21-077", "BT3-081"],
          battleArea: [
            { card: "BT11-075", dp: 5000, as: "host", under: ["EX7-006"] },
            { card: "BT1-009", as: "keepOpen" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    s.state.memory = 5;

    expect(attackPlayer(s, "host")).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT11-079");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT21-077", "BT3-081"]);

    // CR §11-2-3 permits one attack per declaration; this harness verb supplies the otherwise
    // unavailable extra attack so the public attack intent can prove the same-turn Once Per Turn refusal.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attackPlayer(s, "host")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("host").topCard?.cardId).toBe("BT11-079");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT21-077", "BT3-081"]);
    expect(s.state.memory).toBe(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    s.state.memory = 5;
    expect(attackPlayer(s, "host")).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT21-077");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT3-081"]);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX7-006", "BT11-075", "BT11-079"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    await finishTurnLoop(s, loop);
  });

  it("allows the optional evolution to be declined without paying or moving the candidate", async () => {
    const s = setupEngine(
      {
        0: {
          trash: ["BT11-079"],
          battleArea: [
            { card: "BT11-075", as: "host", under: ["EX7-006"] },
            { card: "BT1-009", as: "keepOpen" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(attackPlayer(s, "host")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("host").topCard?.cardId).toBe("BT11-075");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT11-079"]);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
    await finishTurnLoop(s, loop);
  });

  it.each([
    { candidate: "BT3-083", reason: "wrong trait despite a legal purple evolution" },
    { candidate: "BT2-013", reason: "matching trait but wrong evolution color" },
  ])("rejects $reason", async ({ candidate }) => {
    const s = setupEngine(
      {
        0: {
          trash: [candidate],
          battleArea: [
            { card: "BT11-075", as: "host", under: ["EX7-006"] },
            { card: "BT1-009", as: "keepOpen" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(attackPlayer(s, "host")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("host").topCard?.cardId).toBe("BT11-075");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([candidate]);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
    await finishTurnLoop(s, loop);
  });

  it("does not activate when the hand exceeds four cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          trash: ["BT11-079"],
          battleArea: [
            { card: "BT11-075", dp: 5000, as: "host", under: ["EX7-006"] },
            { card: "BT1-009", as: "keepOpen" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(attackPlayer(s, "host")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("host").topCard?.cardId).toBe("BT11-075");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT11-079"]);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
    await finishTurnLoop(s, loop);
  });
});
