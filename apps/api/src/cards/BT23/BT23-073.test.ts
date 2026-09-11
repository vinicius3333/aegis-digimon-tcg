import { Zone, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-073.js";

const EATER_BIT = "BT23-073"; // Eater Bit: [Hudie]/[CS], play cost 3, DP 1000.
const HUDIE_ALLY = "BT23-048"; // Gotsumon: level 3, [Hudie], DP 1000.
const HUDIE_PLAYABLE = "BT23-037"; // Tentomon: level 3, [Hudie], play cost 3 (<= 5).
const HUDIE_HOST = "BT23-050"; // Ankylomon: level 4, [Hudie], legal Gotsumon-inherited host.
const MOTHER_EATER = "BT22-007"; // Mother Eater: the breeding host the second cost names.
const PLAIN_LEVEL_3 = "BT1-009"; // Monodramon: level 3, DP 3000, no [Eater]/[Hudie].
const PLAIN_LEVEL_4 = "BT23-101"; // Hudiemon: level 4, so the On Play must not touch it.
const NEUTRAL_PLAYABLE = "BT1-010"; // Agumon: keeps a turn-loop fixture from auto-passing Main.

const allTurnsReplacement = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];

/**
 * Hands the turn to seat 1 through the real turn loop instead of writing `turnSeat`:
 * seat 0 opens its own Main and ends the phase publicly.
 */
async function handTurnToOpponent(s: ReturnType<typeof setupEngine>): Promise<{ loop: Promise<unknown> }> {
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  return { loop };
}

async function closeLoop(s: ReturnType<typeof setupEngine>, loop: Promise<unknown>): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT23-073 Eater Bit", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition(EATER_BIT)).toMatchObject({
      cardId: EATER_BIT,
      nameEn: "Eater Bit",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 3,
      dp: 1000,
      evoCosts: [],
      forms: ["Eater"],
      attributes: ["-"],
      types: ["Hudie", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("deletes an opponent level 3 Digimon on play", () => {
    const onPlay = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(onPlay).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", levels: [3] } },
    });
  });

  it("offers the two correct leave-prevention costs for another Eater/Hudie Digimon, with no cause qualifier", () => {
    expect(allTurnsReplacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: {
        controller: "mine",
        excludeSelf: true,
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Eater", "Hudie"], match: "trait" }],
      },
    });
    // The printed clause has no "other than by your effects" / "by your opponent's effects"
    // wording, so no cause gate may be compiled: `causeAllows` must stay at "any".
    expect(allTurnsReplacement.leaveCause).toBeUndefined();
    expect(allTurnsReplacement.sourceFilter.leaveReason).toBeUndefined();
    const prevent = allTurnsReplacement.actions[0];
    expect(prevent).toMatchObject({ kind: "Prevent", mode: "leavePlay", optional: true, abortOnDecline: true });
    expect(prevent.costOptions.map((cost: any) => cost.kind)).toEqual(["deleteOwn", "place"]);
    expect(prevent.costOptions[0]).toMatchObject({ target: { filter: { isSelfRef: true }, isSelf: true } });
    expect(prevent.costOptions[1]).toMatchObject({
      targetIsPermanent: true,
      destination: "digivolutionStack",
      position: "bottom",
      host: { filter: { zone: "breeding", nameOrTrait: [{ tokens: ["Mother Eater"], match: "nameExact" }] } },
    });
    expect((compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).frequency).toBe("OncePerTurn");
  });

  it("keeps the inherited Eater play-cost reduction once per turn in breeding", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(inherited).toMatchObject({ isInherited: true, isBreeding: true, frequency: "OncePerTurn" });
    expect(inherited.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed" });
    expect(inherited.actions[0].actions[0]).toMatchObject({ mode: "reduceCost", amount: 1, optional: true });
  });

  it("publicly plays for 3 memory and deletes only the opponent's level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: EATER_BIT, as: "bit" }], deck: Array(6).fill(NEUTRAL_PLAYABLE) },
        1: {
          battleArea: [
            { card: PLAIN_LEVEL_3, as: "level3" },
            { card: PLAIN_LEVEL_4, as: "level4" },
          ],
          deck: Array(6).fill(NEUTRAL_PLAYABLE),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const level3Instance = s.perm("level3").topCard!.instanceId;
    const level4Id = s.perm("level4").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bit").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([level4Id]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([level3Instance]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([EATER_BIT]);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("saves an ally from an OPPONENT effect by deleting itself (Q5349 cause branch)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: EATER_BIT, as: "bit" },
            { card: HUDIE_ALLY, as: "ally" },
          ],
          deck: Array(6).fill(NEUTRAL_PLAYABLE),
        },
        1: { hand: [{ card: EATER_BIT, as: "theirBit" }], deck: Array(6).fill(NEUTRAL_PLAYABLE) },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await handTurnToOpponent(s);
    s.state.memory = -3;
    const allyId = s.perm("ally").permanentId;
    const bitInstance = s.perm("bit").topCard!.instanceId;

    // The opponent's own Eater Bit deletes my level 3 [Hudie] ally through its [On Play].
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirBit").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length > 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([allyId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([bitInstance]);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    await closeLoop(s, loop);
  });

  it("saves an ally from the CONTROLLER'S OWN delayed deletion and keeps its digivolve lock (BT23-037 Q5565 / BT23-048 Q5567)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: EATER_BIT, as: "bit" },
            { card: HUDIE_HOST, as: "host", under: [HUDIE_ALLY] },
          ],
          hand: [{ card: HUDIE_PLAYABLE, as: "played" }],
          deck: Array(12).fill(NEUTRAL_PLAYABLE),
        },
        1: { security: [PLAIN_LEVEL_3], deck: Array(12).fill(NEUTRAL_PLAYABLE) },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    const playedInstance = s.inst("played").instanceId;
    const bitInstance = s.perm("bit").topCard!.instanceId;

    // Gotsumon's inherited [When Attacking] plays the Hudie free; the engine schedules its
    // own DelayedDelete for the end of the OPPONENT's turn — a deletion resolved by seat 0.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedInstance));

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedInstance)).toBe(true);

    // The delayed deletion lands at the end of seat 1's turn.
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    // Eater Bit paid with itself; the played Digimon never left the battle area.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedInstance)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([bitInstance]);

    // Q5565/Q5567 second half: the "can't digivolve" restriction survives the prevention.
    const survivor = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === playedInstance)!;
    s.give(0, Zone.Hand, { card: "BT23-041", as: "evo" });
    s.state.memory = 5;
    expect(observe(s.engine).isRestricted(survivor, "digivolve")).toBe(true);
    const digivolve = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: survivor.permanentId,
      instanceId: s.inst("evo").instanceId,
    });
    expect(digivolve.ok).toBe(false);
    expect(survivor.topCard!.instanceId).toBe(playedInstance);
    await closeLoop(s, loop);
  });

  it("saves an ally from a BATTLE deletion by deleting itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: EATER_BIT, as: "bit" },
            { card: HUDIE_ALLY, as: "attacker" },
          ],
          deck: Array(12).fill(NEUTRAL_PLAYABLE),
        },
        1: {
          battleArea: [{ card: PLAIN_LEVEL_3, as: "blocker", suspended: true }],
          security: [PLAIN_LEVEL_3],
          deck: Array(12).fill(NEUTRAL_PLAYABLE),
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;
    const bitInstance = s.perm("bit").topCard!.instanceId;

    // 1000 DP into 3000 DP: the attacker loses the battle and would be deleted by battle.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: blockerId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length > 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([attackerId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([bitInstance]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([blockerId]);
  });

  it("places itself as the bottom digivolution card of the breeding Mother Eater instead", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: MOTHER_EATER, as: "mother", under: [MOTHER_EATER] },
          battleArea: [
            { card: EATER_BIT, as: "bit" },
            { card: HUDIE_ALLY, as: "ally" },
          ],
          deck: Array(6).fill(NEUTRAL_PLAYABLE),
        },
        1: { hand: [{ card: EATER_BIT, as: "theirBit" }], deck: Array(6).fill(NEUTRAL_PLAYABLE) },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoSelectCards: true,
      },
    );
    await s.ready();
    const { loop } = await handTurnToOpponent(s);
    s.state.memory = -3;
    const allyId = s.perm("ally").permanentId;
    const bitInstance = s.perm("bit").topCard!.instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirBit").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("mother").stack.some((card) => card.instanceId === bitInstance) && s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([allyId]);
    // "bottom digivolution card": index 0 is the bottom of the stack.
    expect(s.perm("mother").stack[0]!.instanceId).toBe(bitInstance);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    await closeLoop(s, loop);
  });

  it("lets the ally leave when the controller declines the prevention", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: EATER_BIT, as: "bit" },
            { card: HUDIE_ALLY, as: "ally" },
          ],
          deck: Array(6).fill(NEUTRAL_PLAYABLE),
        },
        1: { hand: [{ card: EATER_BIT, as: "theirBit" }], deck: Array(6).fill(NEUTRAL_PLAYABLE) },
      },
      { autoDeclineOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await handTurnToOpponent(s);
    s.state.memory = -3;
    const allyInstance = s.perm("ally").topCard!.instanceId;
    const bitId = s.perm("bit").permanentId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirBit").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length > 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([bitId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([allyInstance]);
    await closeLoop(s, loop);
  });

  it("does not protect a non-Eater, non-Hudie ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: EATER_BIT, as: "bit" },
            { card: PLAIN_LEVEL_3, as: "plain" },
          ],
          deck: Array(6).fill(NEUTRAL_PLAYABLE),
        },
        1: { hand: [{ card: EATER_BIT, as: "theirBit" }], deck: Array(6).fill(NEUTRAL_PLAYABLE) },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await handTurnToOpponent(s);
    s.state.memory = -3;
    const plainInstance = s.perm("plain").topCard!.instanceId;
    const bitId = s.perm("bit").permanentId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirBit").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([plainInstance]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([bitId]);
    await closeLoop(s, loop);
  });

  it('does not protect itself (the clause reads "your OTHER Digimon")', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: EATER_BIT, as: "bit" }],
          deck: Array(12).fill(NEUTRAL_PLAYABLE),
        },
        1: {
          battleArea: [{ card: PLAIN_LEVEL_3, as: "blocker", suspended: true }],
          security: [PLAIN_LEVEL_3],
          deck: Array(12).fill(NEUTRAL_PLAYABLE),
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const bitInstance = s.perm("bit").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bit").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([bitInstance]);
  });

  it("from breeding reduces the first Eater play cost by 1 and only once per turn (Q5350)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: MOTHER_EATER, under: [EATER_BIT], as: "mother" },
          hand: [
            { card: EATER_BIT, as: "first" },
            { card: EATER_BIT, as: "second" },
          ],
          deck: Array(6).fill(NEUTRAL_PLAYABLE),
        },
        1: { deck: Array(6).fill(NEUTRAL_PLAYABLE) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3); // printed 3, reduced to 2.

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0); // second copy pays the full 3: once per turn.
  });

  it("gives no play-cost reduction while the same stack sits in the battle area (Q5350 [Breeding] gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MOTHER_EATER, as: "mother", under: [EATER_BIT] }],
          hand: [{ card: EATER_BIT, as: "bit" }],
          deck: Array(6).fill(NEUTRAL_PLAYABLE),
        },
        1: { deck: Array(6).fill(NEUTRAL_PLAYABLE) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bit").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(2); // full printed cost 3.
  });
});
