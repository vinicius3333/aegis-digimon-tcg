import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-029.js";
import "./index.js";
import "../BT24/BT24-005.js";
import "../BT1/BT1-036.js";

describe("BT20-029 Pulsemon", () => {
  it("covers the printed alternate evolution requirements and both clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Bibimon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["SEEKERS"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "YourTurn" });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: {
        nameOrTrait: [
          { tokens: ["Pulsemon"], match: "text" },
          { tokens: ["SEEKERS"], match: "trait" },
        ],
      },
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenBattleDeleteOpponent",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("reduces a qualifying battle-area evolution by 1 but not the same breeding evolution", async () => {
    const battle = setupEngine({
      0: {
        battleArea: [{ card: "BT20-029", as: "pulsemon" }],
        hand: [{ card: "BT20-032", as: "destination" }],
      },
    });
    battle.state.turnSeat = 0;
    await battle.ready();
    battle.state.memory = 3;
    expect(
      battle.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: battle.perm("pulsemon").permanentId,
        instanceId: battle.inst("destination").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => battle.perm("pulsemon").topCard.cardId === "BT20-032");
    expect(battle.state.memory).toBe(1);

    const breeding = setupEngine({
      0: {
        breeding: { card: "BT20-029", as: "pulsemon" },
        hand: [{ card: "BT20-032", as: "destination" }],
      },
    });
    breeding.state.turnSeat = 0;
    await breeding.ready();
    breeding.state.memory = 3;
    expect(
      breeding.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breeding.perm("pulsemon").permanentId,
        instanceId: breeding.inst("destination").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => breeding.perm("pulsemon").topCard.cardId === "BT20-032");
    expect(breeding.state.memory).toBe(0);

    const textOnly = setupEngine({
      0: {
        battleArea: [{ card: "BT20-029", as: "pulsemon" }],
        hand: [{ card: "BT17-034", as: "textOnly" }],
      },
    });
    textOnly.state.turnSeat = 0;
    await textOnly.ready();
    textOnly.state.memory = 3;
    expect(
      textOnly.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: textOnly.perm("pulsemon").permanentId,
        instanceId: textOnly.inst("textOnly").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => textOnly.perm("pulsemon").topCard.cardId === "BT17-034");
    expect(textOnly.state.memory).toBe(1); // Q4322: alternate evolution requirements count as text.
  });

  it("charges the full cost for a legal destination with neither Pulsemon text nor SEEKERS", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-029", as: "pulsemon" }],
        hand: [{ card: "BT20-031", as: "liamon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("liamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").topCard.cardId === "BT20-031");
    expect(s.perm("pulsemon").stack.map((card) => card.cardId)).toEqual(["BT20-029"]);
    expect(s.state.memory).toBe(0);
  });

  it("expires the battle-area reduction when the turn passes to the opponent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-029", as: "pulsemon" }] } });
    await s.ready();
    const pulsemonId = s.perm("pulsemon").permanentId;
    expect(observe(s.engine).costReduction("wouldDigivolve", pulsemonId)).toBe(1);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).costReduction("wouldDigivolve", pulsemonId)).toBe(0);
  });

  it("inherits a once-per-turn memory gain after the host deletes an opponent in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-032", as: "host", under: ["BT20-029"] }] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const memoryBefore = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    expect(s.state.memory).toBe(memoryBefore + 1);
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("gains inherited memory once per turn, then again after the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-032", dp: 7000, as: "host", under: ["BT20-029"] }],
          hand: [{ card: "BT1-036", as: "garurumon" }, "BT1-010"],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "firstOpponent" },
            { card: "BT20-010", dp: 1000, suspended: true, as: "secondOpponent" },
            { card: "BT20-010", dp: 3000, suspended: true, as: "thirdOpponent" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstId = s.perm("firstOpponent").topCard.instanceId;
    const secondId = s.perm("secondOpponent").topCard.instanceId;
    const thirdId = s.perm("thirdOpponent").topCard.instanceId;
    s.state.memory = 5;
    await s.ready();
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length >= 1 &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.length === 2,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(firstId);
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length >= 2 &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondId);
    expect(s.state.memory).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("thirdOpponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length >= 3 &&
        !observe(s.engine).isAttacking() &&
        s.perm("thirdOpponent").isSuspended,
    );
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("thirdOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length >= 4 &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(thirdId);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("naturally gains memory when its legal host deletes an opponent in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-032", dp: 5000, as: "host", under: ["BT20-029"] }] },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "target" }] },
    });
    await s.ready();
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-010"));
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("reaches Pulsemon from a legal Bibimon egg through a public evolution intent", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT20-003", as: "bibimon" }, hand: [{ card: "BT20-029", as: "pulsemon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bibimon").permanentId,
        instanceId: s.inst("pulsemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bibimon").topCard.cardId === "BT20-029");
    expect(s.perm("bibimon").topCard.cardId).toBe("BT20-029");
    expect(s.perm("bibimon").stack.map((card) => card.cardId)).toEqual(["BT20-003"]);
  });
  it.each([
    ["BT24-005", true],
    ["BT20-005", false],
  ] as const)("checks the independent SEEKERS egg route from %s", async (egg, qualifies) => {
    const s = setupEngine({ 0: { breeding: { card: egg, as: "egg" }, hand: [{ card: "BT20-029", as: "pulsemon" }] } });
    s.state.memory = 3;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("pulsemon").instanceId,
      useAlternateCost: true,
    });
    expect(result.ok).toBe(qualifies);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("egg").topCard.cardId).toBe(qualifies ? "BT20-029" : egg);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(qualifies ? [egg] : []);
    expect(s.state.memory).toBe(3);
  });

  it("does not gain inherited memory when host and opponent are deleted simultaneously in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-032", dp: 1000, as: "host", under: ["BT20-029"] }] },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-029", "BT20-032"]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT20-010");
    expect(s.state.memory).toBe(3);
  });
});
