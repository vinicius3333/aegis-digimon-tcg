import { describe, expect, it } from "vitest";
import { assemblyRequirementFor, digivolutionRequirementsFor, EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-016 MetalGreymon", () => {
  it("deletes an opposing Digimon at 6000 DP or less on play and grants the delayed attack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-016", as: "source" }], security: ["BT1-090"] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "deletion", dp: 6000 },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId !== "BT1-011"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("victim").isSuspended).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    expect(s.perm("victim").isSuspended).toBe(true);
  });

  it("applies the deletion and delayed attack grant on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-011", as: "base" }],
          hand: [{ card: "EX12-016", as: "source" }],
          security: ["BT1-090"],
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "deletion", dp: 5000 },
            { card: "BT1-009", as: "victim" },
          ],
        },
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
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId !== "BT1-011"));
    expect(s.perm("base").topCard?.cardId).toBe("EX12-016");

    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    expect(s.perm("victim").isSuspended).toBe(true);
  });

  it("grants the delayed effect but it does not trigger while the recipient is immune (Q6740)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-016", as: "source" }], security: ["BT1-090"] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "deletion", dp: 6000 },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("victim").permanentId,
      "beAffected",
      EffectDuration.Permanent,
      { fromSourceKind: ["Digimon"] },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);

    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
  });

  it("gives the delayed attack to a Digimon that is already unaffected by effects (Q6740)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-016", as: "source" }], security: ["BT1-090"] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "deletion", dp: 6000 },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("victim").permanentId,
      "beAffected",
      EffectDuration.UntilEachTurnEnd,
      { fromSourceKind: ["Digimon"] },
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 0);
    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
  });

  it("does not delete an opposing Digimon above the 6000 DP ceiling", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-016", as: "source" }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("opponent").currentDP).toBe(7000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("plays by Assembly with one matching level-4-or-lower trash material and reduces cost by two", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-016", as: "source" }],
        trash: [{ card: "EX12-007", as: "material" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-016"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-016")!;
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
    expect(played.stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });

  it("accepts the Agumon-name Assembly branch without ME or VB", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-016", as: "source" }],
        trash: [{ card: "BT1-010", as: "material" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-016"));
    expect(s.state.memory).toBe(0);
  });

  it("rejects a level-5 VB card as Assembly material (Q6741)", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-016", as: "source" }],
        trash: [{ card: "EX12-014", as: "material" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it.each([
    {
      placement: "printed",
      stack: { card: "EX12-016", as: "host", under: [{ card: "BT10-019", as: "decodeTarget" }] },
    },
    {
      placement: "inherited",
      stack: {
        card: "EX12-017",
        as: "host",
        under: [
          { card: "BT10-019", as: "decodeTarget" },
          { card: "EX12-016", as: "decodeSource" },
        ],
      },
    },
  ])("executes $placement Decode before an effect-caused leave", async ({ stack }) => {
    const s = setupEngine({ 0: { battleArea: [stack] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const targetId = s.inst("decodeTarget").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
  });

  it("plays only from its own digivolution cards, never from a neighbor's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "host" },
            { card: "EX12-015", as: "neighbor", under: [{ card: "EX12-013", as: "foreign" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const foreignId = s.inst("foreign").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === foreignId)).toBe(false);
    expect(s.perm("neighbor").stack.some((card) => card.instanceId === foreignId)).toBe(true);
  });

  it("does not trigger Decode when leaving by battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX12-016", as: "host", under: [{ card: "EX12-013", as: "target" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.inst("target").instanceId;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(false);
  });

  it("encodes both Decode windows, the printed triggers, evolution alternatives, and Assembly recipe", () => {
    const compiled = registeredCompiledCards.get("EX12-016")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
      { traits: ["ME", "VB"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(assemblyRequirementFor("EX12-016")).toEqual([
      {
        materials: [
          {
            count: 1,
            nameOrTrait: [
              { tokens: ["Agumon", "Greymon"], match: "name" },
              { tokens: ["ME", "VB"], match: "trait" },
            ],
            levelMax: 4,
          },
        ],
        reduceCost: 2,
      },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toHaveLength(3);
    expect(
      compiled.effects.filter((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Decode")),
    ).toHaveLength(2);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } } },
          },
          {
            kind: "SubTrigger",
            event: "startOfYourMainPhase",
            on: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            duration: "untilOpponentTurnEnd",
            actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true } }],
          },
        ],
      });
    }
  });

  it("uses both normal colors and both printed cost-3 evolution alternatives", async () => {
    expect(digivolutionRequirementsFor("EX12-016")).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["ME", "VB"], cost: 3, isAlternate: true },
    ]);
    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["EX12-011", false, 4],
      ["BT10-061", false, 4],
      ["BT10-019", true, 3],
      ["EX12-024", true, 3],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-016", as: "metalGreymon" }],
        },
      });
      s.state.memory = startingMemory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("metalGreymon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-016");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-4 card without Greymon name, ME, or VB", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-069", as: "base" }],
        hand: [{ card: "EX12-016", as: "metalGreymon" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
