import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-008.js";
import "./BT11-016.js";
import { compiled } from "./BT11-068.js";
describe("BT11-068 Mamemon", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-068")).toMatchObject({
      cardId: "BT11-068",
      colors: ["Black"],
      level: 5,
      playCost: 7,
      dp: 6000,
      types: ["Mutant"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 5 }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd", revealCount: 5 }] },
      { trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" },
    ]);
  });

  it("registers both reveal timings as dedicated effects", () => {
    const compiled = runtimeCompiledCard("BT11-068")!;
    expect(
      compiled.effects.filter(({ trigger }) => trigger === "OnPlay" || trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(compiled.effects.find(({ isInherited }) => isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { byEffect: true } }],
    });
  });

  it("reveals 5 on play and plays an eligible Tamer without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-068", as: "mamemon" }],
          deck: ["BT1-088", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mamemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-088"));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-088")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("grants Blocker from a public effect-play, suppresses same-turn repeats, and resets next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-068", as: "base" },
            { card: "BT11-016", as: "phoenix1" },
            { card: "BT11-016", as: "phoenix2" },
            { card: "BT11-016", as: "phoenix3" },
            { card: "BT11-008", as: "recipient" },
            { card: "BT1-013", as: "spare" },
          ],
          hand: [
            { card: "BT8-030", as: "surfimon" },
            { card: "BT11-008", as: "played1" },
            { card: "BT11-008", as: "played2" },
            { card: "BT11-008", as: "played3" },
          ],
          deck: Array.from({ length: 12 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT8-030", as: "battleTarget1", suspended: true },
            { card: "BT8-030", as: "battleTarget2", suspended: true },
            { card: "BT8-030", as: "battleTarget3", suspended: true },
          ],
          deck: Array.from({ length: 12 }, () => "BT1-009"),
          hand: Array.from({ length: 8 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 4;
    const baseId = s.perm("base").permanentId;
    const baseInstanceId = s.inst("base").instanceId;
    const phoenix1Id = s.perm("phoenix1").permanentId;
    const phoenix2Id = s.perm("phoenix2").permanentId;
    const phoenix3Id = s.perm("phoenix3").permanentId;
    const phoenix1InstanceId = s.inst("phoenix1").instanceId;
    const phoenix2InstanceId = s.inst("phoenix2").instanceId;
    const phoenix3InstanceId = s.inst("phoenix3").instanceId;
    const battleTarget1Id = s.perm("battleTarget1").permanentId;
    const battleTarget2Id = s.perm("battleTarget2").permanentId;
    const battleTarget3Id = s.perm("battleTarget3").permanentId;
    preferred.push(s.inst("recipient").instanceId);
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: baseId,
        instanceId: s.inst("surfimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-030");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard.cardId).toBe("BT8-030");
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: phoenix1Id,
        target: { kind: "permanent", permanentId: battleTarget1Id },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === phoenix1InstanceId));
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("played1").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(true);

    preferred.unshift(s.inst("played2").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: phoenix2Id,
        target: { kind: "permanent", permanentId: battleTarget2Id },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === phoenix2InstanceId));
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("played2").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("played2"), "Blocker")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.suspend([battleTarget3Id]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(false);

    preferred.unshift(s.inst("recipient").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: phoenix3Id,
        target: { kind: "permanent", permanentId: battleTarget3Id },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === phoenix3InstanceId));
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("played3").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
