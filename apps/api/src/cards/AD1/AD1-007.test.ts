import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-007 Siriusmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-007");
    const compiled = registeredCompiledCards.get("AD1-007") ?? getCompiledCard("AD1-007");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-007");
    expect(definition?.nameEn).toBe("Siriusmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("places three qualifying Gammamon-text Digimon and deletes only within its DP ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "canoweissmon" },
            { card: "BT10-050", as: "wezen" },
            { card: "BT10-078", as: "gulus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 12000 },
            { card: "BT1-010", as: "over-ceiling", dp: 12001 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    for (let index = 0; index < 3; index += 1) {
      await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseOption").length > index);
      const decision = s.decisions.filter(({ req }) => req.kind === "chooseOption")[index]!;
      expect(decision).toBeDefined();
      expect(decision.req.options?.choices).toEqual(["top", "bottom"]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.req.decisionId,
          response: { kind: "chooseOption", optionIndex: 0 },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.perm("base").stack.length === 4);

    expect(s.perm("base").stack).toHaveLength(4);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over-ceiling").permanentId);
  });

  it("uses the alternate level-5 Gammamon-text evolution requirement for cost 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-011", as: "canoweissmon" }], hand: [{ card: "AD1-007", as: "siriusmon" }] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("canoweissmon").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("canoweissmon").topCard?.cardId === "AD1-007");

    expect(s.state.memory).toBe(2);
  });

  it("accepts qualifying cards from trash and places exactly three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [{ card: "AD1-007", as: "siriusmon" }],
          trash: ["BT10-011", "BT10-050", "BT10-078"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    for (let index = 0; index < 3; index += 1) {
      await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseOption").length > index);
      const decision = s.decisions.filter(({ req }) => req.kind === "chooseOption")[index]!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.req.decisionId,
          response: { kind: "chooseOption", optionIndex: 1 },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.perm("base").stack.length === 4);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("base").stack).toHaveLength(4);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does nothing when fewer than three qualifying cards remain, including decline", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "only-material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "AD1-007");

    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("can place all three Gammamon-text cards at the bottom of its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base", under: ["BT1-001"] }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "gamma-1" },
            { card: "BT10-050", as: "gamma-2" },
            { card: "BT10-078", as: "gamma-3" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    for (let index = 0; index < 3; index += 1) {
      await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseOption").length > index);
      const decision = s.decisions.filter(({ req }) => req.kind === "chooseOption")[index]!;
      expect(decision).toBeDefined();
      expect(decision.req.options?.choices).toEqual(["top", "bottom"]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.req.decisionId,
          response: { kind: "chooseOption", optionIndex: 1 },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.perm("base").stack.length === 4);

    expect(s.perm("base").stack[3]?.cardId).toBe("BT1-001");
    expect(
      s
        .perm("base")
        .stack.slice(0, 3)
        .map((card) => card.cardId),
    ).toEqual(expect.arrayContaining(["BT10-011", "BT10-050", "BT10-078"]));
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });

  it("records an independent top-or-bottom choice for each of the three cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base", under: ["BT1-001"] }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "gamma-1" },
            { card: "BT10-050", as: "gamma-2" },
            { card: "BT10-078", as: "gamma-3" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    const gamma1Id = s.inst("gamma-1").instanceId;
    const gamma2Id = s.inst("gamma-2").instanceId;
    const gamma3Id = s.inst("gamma-3").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });

    const choices = [0, 1, 1];
    for (const [index, optionIndex] of choices.entries()) {
      await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseOption").length > index);
      const decision = s.decisions.filter(({ req }) => req.kind === "chooseOption")[index]!;
      expect(decision).toBeDefined();
      expect(decision.req.options?.choices).toEqual(["top", "bottom"]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.req.decisionId,
          response: { kind: "chooseOption", optionIndex },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.perm("base").stack.length === 5);

    const stack = s.perm("base").stack.map((card) => card.cardId);
    expect(stack).toEqual(["BT10-078", "BT10-050", "BT1-001", "BT10-011", "BT10-011"]);
    const stackIds = s.perm("base").stack.map((card) => card.instanceId);
    expect(stackIds[0]).toBe(gamma3Id);
    expect(stackIds[1]).toBe(gamma2Id);
    expect(stackIds[4]).toBe(gamma1Id);
  });

  it("shares one use between its when-digivolving and when-attacking timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "gamma-1" },
            { card: "BT10-050", as: "gamma-2" },
            { card: "BT10-078", as: "gamma-3" },
          ],
          trash: ["BT10-011", "BT10-050", "BT10-078"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first-target", dp: 12000 },
            { card: "BT1-010", as: "second-target", dp: 12000, suspended: true },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 4);
    await settle();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("base").stack).toHaveLength(4);
  });

  it("attacks without suspending at end of turn only with five digivolution cards", async () => {
    const qualified = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-007",
              as: "qualified",
              suspended: true,
              under: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
            },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await qualified.ready();

    const qualifiedTurn = qualified.engine.runOneTurn();
    const qualifiedMain = (qualified.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !qualifiedMain.isOpen; i += 1) await Promise.resolve();
    qualified.perm("qualified").isSuspended = true;
    expect(qualified.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await qualifiedTurn;
    expect(qualified.perm("qualified").isSuspended).toBe(true);

    const unqualified = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-007",
              as: "unqualified",
              suspended: true,
              under: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
            },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await unqualified.ready();

    const unqualifiedTurn = unqualified.engine.runOneTurn();
    const unqualifiedMain = (unqualified.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !unqualifiedMain.isOpen; i += 1) await Promise.resolve();
    unqualified.perm("unqualified").isSuspended = true;
    expect(unqualified.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await unqualifiedTurn;
    expect(unqualified.state.players[1]!.security).toHaveLength(1);
  });
});
