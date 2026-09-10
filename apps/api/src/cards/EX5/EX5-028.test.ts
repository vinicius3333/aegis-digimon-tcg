import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-028.js";
import "../BT1/BT1-088.js";
import "../BT1/BT1-112.js";
import "../index.js";

describe("EX5-028 Kudamon", () => {
  it("matches the catalog and encodes both conditional clauses", () => {
    expect(getCardDefinition("EX5-028")).toMatchObject({
      cardId: "EX5-028",
      nameEn: "Kudamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      effectText: expect.stringContaining("6 or fewer total cards"),
      inheritedEffectText: expect.stringContaining("gets -2000 DP"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
      target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("plays a yellow Tamer for free at the exact combined-security threshold (Q3592)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-028", as: "kudamon" },
            { card: "BT1-087", as: "tk" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-087"));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["EX5-028", "BT1-087"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX5-028");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-087");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("honors the optional On Play Tamer effect and the strict seven-card boundary", async () => {
    const declined = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-028", as: "kudamon" },
            { card: "BT1-087", as: "tk" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.memory = 10;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, { type: "playCard", instanceId: declined.inst("kudamon").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(declined.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["EX5-028"]);
    expect(declined.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-087"]);
    expect(declined.state.pendingDecision).toBeUndefined();

    const overLimit = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-028", as: "kudamon" },
            { card: "BT1-087", as: "tk" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    overLimit.state.memory = 10;
    await overLimit.ready();
    expect(
      overLimit.engine.applyIntent(0, { type: "playCard", instanceId: overLimit.inst("kudamon").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(overLimit.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["EX5-028"]);
    expect(overLimit.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-087"]);
    expect(overLimit.state.pendingDecision).toBeUndefined();
  });

  it("applies the inherited reduction once per turn through public attacks and resets on the next own turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["EX5-028"] }],
          hand: [
            { card: "BT1-088", as: "greenTamer" },
            { card: "BT1-112", as: "dimensionScissor" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: [],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "battleTarget", dp: 1000, suspended: true },
            { card: "BT1-010", as: "target", dp: 5000, suspended: true },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    const battleTargetId = s.perm("battleTarget").permanentId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-088"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dimensionScissor").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("dimensionScissor").instanceId),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: battleTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === battleTargetId)).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("target").currentDP).toBe(3000);
    const inheritedTriggerCount = () =>
      s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-028").length;
    expect(inheritedTriggerCount()).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(5000);
    expect(inheritedTriggerCount()).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(3000);
    expect(inheritedTriggerCount()).toBe(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not reduce DP when the combined security count is seven", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["EX5-028"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reaches Kudamon through a legal public yellow Digi-Egg evolution", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-005", as: "egg" }],
          hand: [{ card: "EX5-028", as: "kudamon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-005");
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("kudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX5-028");
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT1-005"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.permanentId === breedingId));
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.permanentId === breedingId)!.stack.map((card) => card.cardId),
    ).toEqual(["BT1-005"]);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
