import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-035";

describe("EX11-035 Zephagamon", () => {
  it("preserves printed stats, keywords, cross-player choices, and event-scoped DP scaling", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Zephagamon",
      colors: ["Green"],
      level: 6,
      playCost: 11,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
      types: ["Magic Knight", "Vortex Warriors", "LIBERATOR", "Bird Dragon"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Green"], cost: 3, isAlternate: false }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Piercing" }),
        expect.objectContaining({ keyword: "Vortex" }),
        expect.objectContaining({ keyword: "Blocker" }),
      ]),
    );
    const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")!;
    expect(digivolving.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "Unsuspend",
          optional: true,
          target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
        }),
        expect.objectContaining({
          kind: "Suspend",
          optional: true,
          target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
        }),
      ]),
    );
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions).toHaveLength(1);
    expect(allTurns.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(irNode(allTurns.actions[0]!).actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          colors: ["Green"],
          dp: { op: "lte", value: 3000 },
          nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "traitContains" }],
        },
      },
      dpCeilingModifier: {
        mode: "raiseCeiling",
        amount: 2000,
        scaling: { per: 1, filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] }, unit: "cards" },
      },
    });
  });

  it("plays an Avian up to the DP ceiling raised by all suspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "trigger" },
          ],
          hand: [{ card: "BT16-007", as: "avian" }],
        },
        1: { battleArea: [{ card: "BT1-010", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("avian").instanceId);
    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT16-007")).toBe(true);
    assertNoLoudGap(s);
  });

  it("exposes the live suspended-Digimon count seam at the 4000-DP Giant Bird boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "trigger" },
          ],
          hand: [{ card: "BT16-008", as: "giantBird" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("giantBird").instanceId);
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => false, 30);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT16-008")).toBe(true);
    assertNoLoudGap(s);
  });

  it("uses a public attack suspension as an alternate scaling producer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [{ card: "BT16-008", as: "giantBird" }],
          deck: ["BT1-011", "BT1-011", "BT1-011"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-011", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("giantBird").instanceId);
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT16-008")).toBe(true);
    assertNoLoudGap(s);
  });

  it("ignores an opponent's Digimon suspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "BT16-007", as: "avian" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("avian").instanceId);
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("avian").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("uses the public digivolution route and resolves the optional unsuspend then suspend sequence", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-032", as: "host" }],
          hand: [{ card: cardId, as: "zephagamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    preferred.push(s.perm("host").permanentId);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("zephagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === cardId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("matches partial Avian/Bird traits, green color, DP ceiling, and all suspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "trigger" },
          ],
          hand: [
            { card: "EX11-026", as: "birdDragon" },
            { card: "BT1-012", as: "redBird" },
            { card: "BT1-009", as: "wrongTrait" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("birdDragon").instanceId);
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-026")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId: remainingCardId }) => remainingCardId)).toEqual([
      "BT1-012",
      "BT1-009",
    ]);
    assertNoLoudGap(s);
  });

  it("resets the suspension watcher on the next own turn through the public loop", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "firstTrigger" },
            { card: "BT1-010", as: "secondTrigger" },
          ],
          hand: [
            { card: "BT16-007", as: "firstAvian" },
            { card: "BT16-007", as: "secondAvian" },
          ],
          deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"],
        },
        1: { deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstAvian").instanceId, s.inst("secondAvian").instanceId);
    s.state.turnSeat = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("firstTrigger").permanentId]);
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT16-007").length === 1,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("secondTrigger").permanentId]);
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT16-007").length === 2,
    );
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT16-007")).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
