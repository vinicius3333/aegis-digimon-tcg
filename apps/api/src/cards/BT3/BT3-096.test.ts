import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./BT3-096.js";
import "../ST2/ST2-13.js";
import "../BT2/BT2-107.js";
import "../P/P-027.js";

describe("BT3-096 Mimi Tachikawa", () => {
  it("matches official metadata and publishes the typed Option-use watcher", () => {
    expect(getCardDefinition("BT3-096")).toMatchObject({
      nameEn: "Mimi Tachikawa",
      colors: ["Purple"],
      playCost: 2,
      effectText: expect.stringContaining("When a player uses an Option card"),
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toEqual(getCompiledCard("BT3-096"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
  it("may suspend when an Option is used to gain 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-096", as: "mimi" },
            { card: "BT1-029", as: "blueSource" },
          ],
          hand: [{ card: "ST2-13", as: "hammerSpark" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("hammerSpark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mimi").isSuspended && s.state.memory === 2, 5000);

    expect(s.perm("mimi").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("offers each of 2 Mimis exactly once for a single Option use after recomputes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-096", as: "firstMimi" },
            { card: "BT3-096", as: "secondMimi" },
            { card: "BT1-029", as: "blueSource" },
          ],
          hand: [{ card: "ST2-13", as: "hammerSpark" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("hammerSpark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstMimi").isSuspended && s.perm("secondMimi").isSuspended && s.state.memory === 3);
    await s.ready();

    expect([s.perm("firstMimi").isSuspended, s.perm("secondMimi").isSuspended]).toEqual([true, true]);

    expect(s.state.memory).toBe(3);

    const mimiPrompts = s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096");
    expect(mimiPrompts).toHaveLength(2);
  });

  it("cannot gain memory again from already suspended copies on a later Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-096", as: "firstMimi" },
            { card: "BT3-096", as: "secondMimi" },
            { card: "BT1-029", as: "blueSource" },
          ],
          hand: [
            { card: "ST2-13", as: "firstSpark" },
            { card: "ST2-13", as: "secondSpark" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstSpark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstMimi").isSuspended && s.perm("secondMimi").isSuspended && s.state.memory === 3);
    await s.ready();
    const afterFirstOption = s.state.memory;
    const promptsAfterFirstOption = s.decisions.filter(
      ({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096",
    ).length;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("secondSpark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === afterFirstOption + 1);
    await s.ready();

    expect(s.state.memory).toBe(afterFirstOption + 1);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096")).toHaveLength(
      promptsAfterFirstOption,
    );
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-096", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});

describe("BT3-096 Mimi Tachikawa — KB Q&A rulings", () => {
  it("activates only after the used Option card's [Main] effect has resolved (Q1127)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-096", as: "mimi" },
          { card: "BT1-029", as: "blueSource" },
        ],
        hand: [{ card: "ST2-13", as: "hammerSpark" }],
      },
    });
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hammerSpark").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const mimiPrompt = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096");

    expect(mimiPrompt).toBeDefined();
    expect(s.state.memory).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: mimiPrompt!.req.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mimi").isSuspended && s.state.memory === 2);

    expect(s.perm("mimi").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("does not trigger when an Option card's [Security] effect activates without being used (Q1128)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-007", as: "attacker", dp: 20_000 },
            { card: "BT1-029", as: "blueSource" },
          ],
          hand: [{ card: "ST2-13", as: "usedOption" }],
        },
        1: {
          battleArea: [{ card: "BT3-096", as: "mimi" }],
          security: [{ card: "ST2-13", as: "securityOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const mimiPrompts = () =>
      s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.memory === 3);
    await advance(s.engine).finishAttack();

    expect(s.state.memory).toBe(3);
    expect(s.perm("mimi").isSuspended).toBe(false);
    expect(mimiPrompts()).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("usedOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mimi").isSuspended);

    expect(mimiPrompts()).toHaveLength(1);
  });

  it("triggers when an Option card is used through MetalGarurumon's <Digi-Burst> (Q4136)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-027", as: "metalGarurumon", under: ["P-019", "P-034"] },
            { card: "BT2-069", as: "recipient" },
            { card: "BT3-096", as: "mimi" },
          ],
          hand: [{ card: "BT2-107", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    s.state.memory = 0;
    const optionId = s.inst("option").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("metalGarurumon").topCard.instanceId,
        effectKey: "P-027/digi-burst-use-option",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === optionId) &&
        s.perm("mimi").isSuspended &&
        s.state.memory === 1,
    );

    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096")).toHaveLength(1);
    expect(s.perm("mimi").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
