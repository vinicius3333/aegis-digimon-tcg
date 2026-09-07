import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-046.js";
import "../index.js";

describe("BT21-046 compiled implementation", () => {
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

  it("preserves the zero-cost Dracomon alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Dracomon"], cost: 0, isAlternate: true }]);
  });

  it("optionally digivolves itself into a Coredramon from hand for free at both timings", () => {
    for (const trigger of ["StartOfYourMainPhase", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ trigger, optional: true });
      expect(effect?.actions).toEqual([
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Coredramon"], match: "nameExact" }] },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ]);
    }
  });

  it("does not treat Dracomon (X Antibody) as the standalone Dracomon alternate", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-046", as: "nearDracomon" }],
        hand: [{ card: "BT21-046", as: "dracomonX" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nearDracomon").permanentId,
        instanceId: s.inst("dracomonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("preserves the inherited end-of-turn DNA Digivolution from two of your Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toEqual(
      expect.objectContaining({
        trigger: "EndOfYourTurn",
        isInherited: true,
        actions: [
          {
            kind: "DnaDigivolve",
            materials: {
              filter: { controller: "mine", kind: ["Digimon"], includesSelf: true },
              count: 2,
              isSelf: true,
            },
            into: { controllerDefault: "mine", kind: ["Digimon"], zone: "hand" },
            payCost: true,
            optional: true,
          },
        ],
      }),
    );
  });

  it("enters through the public play intent before its start-main/evolution hooks resolve", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-046", as: "dracomonX" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("dracomonX").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("dracomonX").instanceId)).toBe(
      true,
    );
  });

  it("zero-cost digivolves from Dracomon and immediately free-digivolves into Coredramon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand: [
            { card: "BT21-046", as: "dracomonX" },
            { card: "BT20-023", as: "coredramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("coredramon").instanceId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dracomon").permanentId,
        instanceId: s.inst("dracomonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("dracomon").topCard.instanceId === s.inst("coredramon").instanceId &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("dracomon").stack.map((card) => card.instanceId)).toEqual([
      s.inst("dracomon").instanceId,
      s.inst("dracomonX").instanceId,
    ]);
  });

  it("publicly free-digivolves into Coredramon at the start of the main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-046", as: "dracomonX" }],
          hand: [{ card: "EX3-018", as: "coredramon" }],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: { deck: ["BT1-002", "BT1-002", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("dracomonX").topCard.instanceId === s.inst("coredramon").instanceId);
    expect(s.perm("dracomonX").topCard.instanceId).toBe(s.inst("coredramon").instanceId);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly declines the eligible start-main Coredramon evolution and preserves the hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-046", as: "dracomonX" }],
          hand: [{ card: "EX3-018", as: "coredramon" }],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: { deck: ["BT1-002", "BT1-002", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("dracomonX").topCard.cardId).toBe("BT21-046");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("coredramon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("uses its inherited end-of-turn effect for a real Examon DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon", under: ["BT21-046", "BT12-022", "BT20-025"] },
            { card: "BT20-027", as: "slayerdramon", under: ["BT12-022", "BT20-025"] },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("breakdramon"));
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-045") &&
        s.state.pendingDecision === undefined,
    );

    const examon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-045")!;
    expect(examon.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT21-046", "BT20-044", "BT20-027"]),
    );
  });

  it("resolves inherited DNA through the production turn lifecycle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon", under: ["BT21-046", "BT12-022", "BT20-025"] },
            { card: "BT20-027", as: "slayerdramon", under: ["BT12-022", "BT20-025"] },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
          deck: ["BT1-001"],
        },
        1: { deck: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-045")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly declines the inherited DNA evolution at end of turn and preserves both materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon", under: ["BT21-046", "BT12-022", "BT20-025"] },
            { card: "BT20-027", as: "slayerdramon", under: ["BT12-022", "BT20-025"] },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: { deck: ["BT1-002", "BT1-002", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await turn;
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("breakdramon").topCard.cardId).toBe("BT20-044");
    expect(s.perm("slayerdramon").topCard.cardId).toBe("BT20-027");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-045")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("examon").instanceId);
    await turn;
  });
});
