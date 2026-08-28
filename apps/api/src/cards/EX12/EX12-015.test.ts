import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-015 Gokuumon", () => {
  it("reduces an opposing Digimon by 4000 on play and grants Alliance to another SW Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "ally" }],
          hand: [{ card: "EX12-015", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "opponent" }], security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const allyId = s.perm("ally").permanentId;
    const opponentId = s.perm("opponent").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === allyId),
    );
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId));

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("ally").permanentId, "Alliance")).toBe(true);
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "attackDeclared", attackerPermanentId: allyId }));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(false);
  });

  it("applies the same effect on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "ally" },
            { card: "EX12-011", as: "base" },
          ],
          hand: [{ card: "EX12-015", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 5000 }], security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 1000);
    await s.ready();

    expect(s.perm("base").topCard?.cardId).toBe("EX12-015");
    expect(s.perm("opponent").currentDP).toBe(1000);
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("ally").permanentId, "Alliance")).toBe(true);
  });

  it("may decline granting Alliance, in which case no forced attack occurs", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "ally" }],
          hand: [{ card: "EX12-015", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "opponent" }], security: ["BT1-090"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved"));

    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
  });

  it("deletes an opposing Digimon at 6000 DP or less from the inherited attack window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-015", as: "host", under: ["EX12-015"] }] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "first", dp: 6000 },
            { card: "BT1-011", as: "second", dp: 6000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("keeps a 7000 DP opposing Digimon above the inherited deletion ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-015", as: "host", under: ["EX12-015"] }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("DigiXroses with one level-5-or-lower SW card for a cost reduction of 2", async () => {
    expect(digiXrosRequirementFor("EX12-015")).toEqual([
      {
        materials: [
          {
            levelMax: 5,
            nameOrTrait: [
              { tokens: ["Gokuumon"], match: "text" },
              { tokens: ["SW"], match: "trait" },
            ],
          },
        ],
        count: 2,
        maxMaterials: 1,
      },
    ]);
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-015", as: "source" },
            { card: "EX12-006", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-015"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-015")!;
    expect(played.stack.map((card) => card.cardId)).toEqual(["EX12-006"]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects a level-6 SW card as DigiXros material (Q6738)", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX12-015", as: "source" },
          { card: "EX12-019", as: "material" },
        ],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("rejects two DigiXros materials because the printed recipe allows exactly one", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX12-015", as: "source" },
          { card: "EX12-006", as: "first" },
          { card: "EX12-039", as: "second" },
        ],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("accepts a level-5 non-SW card through Gokuumon text (Q6736)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-015", as: "source" },
            { card: "BT12-039", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-015"));
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-015")!;
    expect(played.stack.map((card) => card.cardId)).toEqual(["BT12-039"]);
    expect(s.state.memory).toBe(0);
  });

  it("encodes the KB-mandated Alliance-to-attack linkage and once-per-turn inherited deletion", () => {
    const compiled = registeredCompiledCards.get("EX12-015")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[1]).toMatchObject({
        kind: "GainKeyword",
        optional: true,
        target: { count: 1, filter: { excludeSelf: true, nameOrTrait: [{ match: "trait", tokens: ["SW"] }] } },
        keyword: { keyword: "Alliance" },
        duration: "forTheTurn",
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "Attack",
        mandatory: true,
        condition: { kind: "ifThisEffectActed" },
        target: { count: 1, sameTarget: true },
        withoutSuspending: false,
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 6000 } } }, optional: true }],
    });
    expect(compiled.digiXrosRequirement).toEqual(digiXrosRequirementFor("EX12-015"));
  });

  it("uses both normal colors and the level-4 Shambala cost-3 alternate", async () => {
    expect(digivolutionRequirementsFor("EX12-015")).toEqual([
      { level: 4, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["EX12-011", false, 4],
      ["BT1-051", false, 4],
      ["EX12-025", true, 3],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-015", as: "gokuumon" }],
        },
      });
      s.state.memory = startingMemory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gokuumon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-015");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-4 card without Shambala", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-069", as: "base" }],
        hand: [{ card: "EX12-015", as: "gokuumon" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gokuumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
