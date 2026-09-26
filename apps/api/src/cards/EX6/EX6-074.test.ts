import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-074.js";
import { matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX6-074 Mirei Mikagura", () => {
  it("gains memory when an exact printed-trait Digimon is played, then can digivolve from trash and DNA digivolve at end of turn", () => {
    const runtime = runtimeCompiledCard("EX6-074");
    expect(runtime).toMatchObject({ coverage: "full", residual: [] });
    expect(runtime?.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Holy Beast", "Archangel", "Fallen Angel"], match: "trait" }],
      },
      actions: [
        { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: {
            nameOrTrait: [{ tokens: ["Angewomon", "LadyDevimon"], match: "nameExact" }],
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          optional: true,
          payCost: true,
          into: { hasDnaDigivolutionRequirement: true },
        },
      ],
    });
    const digivolveReference = { tokens: ["Angewomon", "LadyDevimon"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Angewomon" }, digivolveReference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Angewomon (X Antibody)" }, digivolveReference)).toBe(false);
  });
  it("plays itself without cost from security", () =>
    expect(runtimeCompiledCard("EX6-074")?.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    }));
  it("publicly suspends Mirei and gains memory when a Holy Beast is played", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-074", as: "mirei" }], hand: [{ card: "BT1-046", as: "holy" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.playInstances([s.inst("holy").instanceId]);
    expect(s.perm("mirei").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("publicly digivolves another own Digimon from trash after a qualifying play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-074", as: "mirei" },
            { card: "BT1-055", as: "base" },
            { card: "BT1-053", as: "other" },
          ],
          hand: [{ card: "BT1-046", as: "holy" }],
          trash: [{ card: "BT11-042", as: "angewomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("other").topCard!.instanceId);
    s.state.memory = 2;
    await advance(s.engine).verb.playInstances([s.inst("holy").instanceId]);

    expect(s.perm("other").topCard?.cardId).toBe("BT11-042");
    expect(s.perm("base").topCard?.cardId).toBe("BT1-055");
    expect(s.perm("mirei").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("publicly DNA digivolves once at end of turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-074", as: "mirei" },
            { card: "BT10-061", as: "blackOne" },
            { card: "BT10-035", as: "yellowOne" },
            { card: "BT10-061", as: "blackTwo" },
            { card: "BT10-035", as: "yellowTwo" },
          ],
          hand: [
            { card: "BT16-063", as: "resultOne" },
            { card: "BT16-063", as: "resultTwo" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    s.state.turnSeat = 0;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT16-063"));

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    // The first Shakkoumon keeps its materials' slot, so name the second pair explicitly.
    preferred.push(s.perm("blackTwo").topCard!.instanceId, s.perm("yellowTwo").topCard!.instanceId);
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;

    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "BT16-063")).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("resultTwo").instanceId)).toBe(false);
  });

  it("publicly plays Mirei from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX6-074", as: "mirei", faceUp: true }], deck: Array(10).fill("BT1-009") },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker" }],
        deck: Array(10).fill("BT1-010"),
        security: Array(6).fill("BT1-010"),
      },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-074"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-074")).toBe(true);
  });

  it("rejects a non-DNA target through the public end-of-turn window (Q3813)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-074", as: "mirei" },
            { card: "BT10-061", as: "black" },
            { card: "BT10-035", as: "yellow" },
          ],
          hand: [{ card: "BT1-101", as: "invalidResult" }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeEndTurn = {
      battleArea: s.state.players[0]!.battleArea.map((perm) => ({
        permanentId: perm.permanentId,
        topCardId: perm.topCard?.instanceId,
        sourceIds: perm.stack.map((card) => card.instanceId),
      })),
      deck: s.state.players[0]!.deck.map((card) => card.instanceId),
      decisionCount: s.decisions.length,
      hand: s.state.players[0]!.hand.map((card) => card.instanceId),
      security: s.state.players[0]!.security.map((card) => card.instanceId),
      trash: s.state.players[0]!.trash.map((card) => card.instanceId),
      opponent: {
        battleArea: s.state.players[1]!.battleArea.map((perm) => ({
          permanentId: perm.permanentId,
          topCardId: perm.topCard?.instanceId,
          sourceIds: perm.stack.map((card) => card.instanceId),
        })),
        deck: s.state.players[1]!.deck.map((card) => card.instanceId),
        hand: s.state.players[1]!.hand.map((card) => card.instanceId),
        security: s.state.players[1]!.security.map((card) => card.instanceId),
        trash: s.state.players[1]!.trash.map((card) => card.instanceId),
      },
    };
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("invalidResult").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "BT1-101")).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.map((perm) => ({
        permanentId: perm.permanentId,
        topCardId: perm.topCard?.instanceId,
        sourceIds: perm.stack.map((card) => card.instanceId),
      })),
    ).toEqual(beforeEndTurn.battleArea);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeEndTurn.deck);
    expect(s.decisions).toHaveLength(beforeEndTurn.decisionCount);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(beforeEndTurn.hand);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(beforeEndTurn.security);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(beforeEndTurn.trash);
    expect(
      s.state.players[1]!.battleArea.map((perm) => ({
        permanentId: perm.permanentId,
        topCardId: perm.topCard?.instanceId,
        sourceIds: perm.stack.map((card) => card.instanceId),
      })),
    ).toEqual(beforeEndTurn.opponent.battleArea);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(beforeEndTurn.opponent.deck);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(beforeEndTurn.opponent.hand);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(beforeEndTurn.opponent.security);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(beforeEndTurn.opponent.trash);
  });

  it("rejects an unspecified hand DNA material through the public end-of-turn window (Q3814)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-074", as: "mirei" },
            { card: "BT10-061", as: "blackField" },
          ],
          hand: [
            { card: "BT16-063", as: "result" },
            { card: "BT10-061", as: "invalidHandMaterial" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeEndTurn = {
      battleArea: s.state.players[0]!.battleArea.map((perm) => ({
        permanentId: perm.permanentId,
        topCardId: perm.topCard?.instanceId,
        sourceIds: perm.stack.map((card) => card.instanceId),
      })),
      deck: s.state.players[0]!.deck.map((card) => card.instanceId),
      decisionCount: s.decisions.length,
      hand: s.state.players[0]!.hand.map((card) => card.instanceId),
      security: s.state.players[0]!.security.map((card) => card.instanceId),
      trash: s.state.players[0]!.trash.map((card) => card.instanceId),
      opponent: {
        battleArea: s.state.players[1]!.battleArea.map((perm) => ({
          permanentId: perm.permanentId,
          topCardId: perm.topCard?.instanceId,
          sourceIds: perm.stack.map((card) => card.instanceId),
        })),
        deck: s.state.players[1]!.deck.map((card) => card.instanceId),
        hand: s.state.players[1]!.hand.map((card) => card.instanceId),
        security: s.state.players[1]!.security.map((card) => card.instanceId),
        trash: s.state.players[1]!.trash.map((card) => card.instanceId),
      },
    };
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("result").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("invalidHandMaterial").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "BT16-063")).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.map((perm) => ({
        permanentId: perm.permanentId,
        topCardId: perm.topCard?.instanceId,
        sourceIds: perm.stack.map((card) => card.instanceId),
      })),
    ).toEqual(beforeEndTurn.battleArea);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeEndTurn.deck);
    expect(s.decisions).toHaveLength(beforeEndTurn.decisionCount);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(beforeEndTurn.hand);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(beforeEndTurn.security);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(beforeEndTurn.trash);
    expect(
      s.state.players[1]!.battleArea.map((perm) => ({
        permanentId: perm.permanentId,
        topCardId: perm.topCard?.instanceId,
        sourceIds: perm.stack.map((card) => card.instanceId),
      })),
    ).toEqual(beforeEndTurn.opponent.battleArea);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(beforeEndTurn.opponent.deck);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(beforeEndTurn.opponent.hand);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(beforeEndTurn.opponent.security);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(beforeEndTurn.opponent.trash);
  });
});
