import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-028.js";
import "../index.js";

describe("BT21-028 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("models the printed optional bottom-material cost before each lowest-DP deletion", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          target: { from: ["hand"] },
        },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("publishes Security Attack +1, Raid, and both alternate level-5 evolution routes", async () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Gammamon"], cost: 3, isAlternate: true },
      { traits: ["Hero"], cost: 3, isAlternate: true, level: 5 },
    ]);
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-028", as: "siriusmon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("siriusmon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("siriusmon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("siriusmon"), "Raid")).toBe(true);
  });

  it("places a qualifying hand card under itself before deleting the lowest-DP opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "siriusmon" }],
          hand: [{ card: "BT21-010", as: "gammamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("siriusmon"));
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== lowId));

    expect(s.perm("siriusmon").stack.some((card) => card.cardId === "BT21-010")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
  });

  it("still pays the optional hand placement when a public attack has no deletion target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "siriusmon", enteredThisTurn: false }],
          hand: [{ card: "BT21-010", as: "material" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-001"], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("siriusmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("siriusmon").stack.map((card) => card.instanceId)).toContain(s.inst("material").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("deletes exactly one lowest-DP tie through the effect window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "siriusmon", enteredThisTurn: false }],
          hand: [{ card: "BT21-010", as: "material" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA", dp: 3000 },
            { card: "BT1-010", as: "lowB", dp: 3000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("siriusmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.perm("siriusmon").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
    const survivorId = s.state.players[1]!.battleArea[0]!.permanentId;
    expect(survivorId).toBe(s.perm("lowB").permanentId);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("pays the hand cost during a natural attack after Raid resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "siriusmon", enteredThisTurn: false }],
          hand: [{ card: "BT21-010", as: "material" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 6000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("siriusmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId || p.permanentId === highId),
    );
    expect(s.perm("siriusmon").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });

  it("uses Raid to redirect a public attack to the opponent's highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-028", as: "siriusmon", dp: 13000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 6000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highId = s.perm("high").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("siriusmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(true);
  });

  it("performs two security checks from Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-028", as: "siriusmon", enteredThisTurn: false }] },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("siriusmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it.each([
    { base: "BT21-077", material: "BT21-010" },
    { base: "BT21-021", material: "BT21-021" },
  ])(
    "evolves from the $base alternate route and pays a qualifying bottom-material cost",
    async ({ base, material }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base", under: [{ card: "BT1-009", as: "existing-source" }] }],
            hand: [
              { card: "BT21-028", as: "siriusmon" },
              { card: material, as: "material" },
            ],
          },
          1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("siriusmon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT21-028");
      await settle(() => s.state.players[1]!.battleArea.length === 0);

      expect(s.state.memory).toBe(3);
      expect(s.perm("base").stack[0]?.instanceId).toBe(s.inst("material").instanceId);
      expect(s.perm("base").stack[1]?.instanceId).toBe(s.inst("existing-source").instanceId);
    },
  );

  it("does not pay or delete with only a nonmatching hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "siriusmon" }],
          hand: [{ card: "BT1-009", as: "nonmatching" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("siriusmon"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("siriusmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonmatching").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("target").permanentId,
    );
  });

  it("permits declining a payable bottom-material cost without deleting", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-077", as: "base" }],
          hand: [
            { card: "BT21-028", as: "siriusmon" },
            { card: "BT21-010", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 4000 }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-028");

    expect(s.perm("base").stack.map((card) => card.instanceId)).not.toContain(s.inst("material").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("material").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("target").permanentId,
    );
  });
});
