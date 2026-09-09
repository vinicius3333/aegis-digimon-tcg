import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11-024 Cendrillmon", () => {
  it("evolves from a yellow level 5 and resolves the When Digivolving reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-022", as: "base", dp: 7000 }],
          hand: [{ card: "EX11-024", as: "cendrill" }, "EX11-019"],
        },
        1: { battleArea: [{ card: "EX11-019", as: "opponent", dp: 2000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const opponent = s.perm("opponent");
    const initialDP = opponent.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cendrill").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX11-024" && opponent.currentDP < initialDP, 600);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-024");
    expect(opponent.currentDP).toBeLessThan(initialDP);
  });

  it("encodes Alliance, Overclock, Puppet play, Familiar scaling, and per-own-Digimon DP scaling", () => {
    expect(getCardDefinition("EX11-024")).toMatchObject({
      nameEn: "Cendrillmon",
      colors: ["Yellow"],
      level: 6,
      playCost: 11,
      dp: 12000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      types: ["Puppet", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard("EX11-024")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(digivolutionRequirementsFor("EX11-024")).toEqual([]);
    expect(compiled.effects.slice(0, 2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] }),
        expect.objectContaining({ keywords: [{ keyword: "Overclock", raw: "＜Overclock ([Puppet] Trait)＞" }] }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }),
          expect.objectContaining({
            kind: "PlayToken",
            tokens: ["Familiar"],
            scaling: expect.objectContaining({ unit: "cards", per: 1 }),
          }),
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "forTheTurn",
      scaling: { unit: "cards", per: 1 },
    });
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("plays one eligible Puppet and one Familiar for each opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-024", as: "source" },
            { card: "BT13-035", as: "puppet" },
            { card: "EX11-022", as: "tooHigh" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0 && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-024"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT13-035");
    expect(
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "TOKEN-Familiar-Token"),
    ).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX11-022");
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline both On Play actions", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-024", as: "source" },
            { card: "BT13-035", as: "puppet" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-010"], deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0 && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("offers two simultaneous When Digivolving activations for Q5811", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-022", as: "base" }],
          hand: [
            { card: "EX11-024", as: "source" },
            { card: "BT13-035", as: "puppet" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT13-035"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "TOKEN-Familiar-Token")).toBe(true);
    expect(s.perm("opponent").currentDP).toBeLessThan(20000);
    assertNoLoudGap(s);
  });

  it("gives exactly -3000 per own Digimon when attacking", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-024", as: "source" },
          { card: "BT1-009", as: "ally" },
          { card: "TOKEN-Familiar-Token", as: "token" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "opponent", dp: 15000, suspended: true }],
        security: ["BT1-011"],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Overclock")).toBe(true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0 && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 6000);
    expect(s.perm("opponent").currentDP).toBe(6000);
    if (s.state.turnSeat === 0) s.engine.applyIntent(0, { type: "endPhase" });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("uses only the ordinary yellow Lv.5 evolution route", async () => {
    const valid = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "base" }], hand: [{ card: "EX11-024", as: "source" }] },
    });
    valid.state.memory = 3;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").topCard.cardId === "EX11-024");

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT2-076", as: "base" }], hand: [{ card: "EX11-024", as: "source" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses Overclock publicly by deleting another Puppet and attacking without suspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-024", as: "cendrill" },
            { card: "EX11-021", as: "cost" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("cendrill").isSuspended).toBe(false);
    expect(s.events.some((event) => (event as { kind?: string }).kind === "attackDeclared")).toBe(true);
    assertNoLoudGap(s);
  });
});
