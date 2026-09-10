import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-033.js";
import "../index.js";

describe("EX5-033 Mitamamon", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition("EX5-033")).toMatchObject({
      cardId: "EX5-033",
      nameEn: "Mitamamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["God Beast"],
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      effectText: expect.stringContaining("[When Digivolving] [When Attacking] [Once Per Turn]"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });

    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    const attacking = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking");
    const playAction = {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          colors: ["Yellow"],
          levelComparison: { op: "lte", value: 4 },
        },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      bindResultAs: "playedByThisEffect",
      cost: {
        kind: "trash",
        target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
        raw: "By trashing the top card of your security stack",
      },
      optional: true,
      abortOnDecline: true,
    };
    const rushAction = {
      kind: "GainKeyword",
      target: { filter: { boundRef: "playedByThisEffect", kind: ["Digimon"] }, count: 1 },
      keyword: { keyword: "Rush", raw: "＜Rush＞" },
      duration: "forTheTurn",
    };
    expect(digivolving).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(attacking).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(digivolving?.actions).toEqual([playAction, rushAction]);
    expect(attacking?.actions).toEqual([playAction, rushAction]);

    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toEqual([
      {
        kind: "Aura",
        target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow"] }, count: "all" },
        effect: { kind: "keyword", keyword: { keyword: "Barrier", raw: "＜Barrier＞" } },
      },
    ]);
    const opponentTurn = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(opponentTurn?.actions).toEqual([
      {
        kind: "GainKeyword",
        target: {
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
            levelComparison: {
              op: "gte",
              value: {
                kind: "dynamicCount",
                filter: { zone: "security", controller: "any" },
                unit: "cards",
              },
            },
          },
          count: "all",
          whileMatchesTargetFilter: true,
        },
        keyword: { keyword: "SecurityAttack", amount: -2, raw: "＜Security Attack -2＞" },
        duration: "untilOpponentTurnEnd",
      },
    ]);
  });

  it("trashes top security to play a yellow level-four Digimon with Rush on public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-058", as: "base" }],
          hand: [
            { card: "EX5-033", as: "mitamamon" },
            { card: "BT1-045", as: "played" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mitamamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-045"));

    const played = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT1-045");
    expect(played).toBeDefined();
    expect(observe(s.engine).hasKeyword(played!, "Rush")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-045");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("shares the Once Per Turn cost between digivolving and attacking, then resets next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-058", as: "base" }],
          hand: [
            { card: "EX5-033", as: "mitamamon" },
            { card: "BT1-045", as: "first" },
            { card: "BT1-047", as: "second" },
          ],
          deck: ["BT1-017", "BT1-018", "BT1-019", "BT1-020"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          security: ["BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 10;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const turn = advance(s.engine);
    await turn.waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mitamamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-045"));
    const securityAfterDigivolving = s.state.players[0]!.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityAfterDigivolving && s.perm("base").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(securityAfterDigivolving);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("second").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn.waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn.waitForMainPhase(0);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === securityAfterDigivolving - 1 &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-047"),
    );
    expect(s.state.players[0]!.security).toHaveLength(securityAfterDigivolving - 1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-047")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("answers Q3597-Q3599 with a live combined-security threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-033", as: "mitamamon" }], security: ["BT1-009", "BT1-010"] },
      1: {
        battleArea: [
          { card: "BT1-016", as: "qualifying" },
          { card: "BT1-010", as: "belowTotalSecurity" },
        ],
        security: ["BT1-011", "BT1-012"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await settle(() => observe(s.engine).keywordAmount(s.perm("qualifying"), "SecurityAttack") === -2, 2000);
    expect(observe(s.engine).keywordAmount(s.perm("qualifying"), "SecurityAttack")).toBe(-2);
    expect(observe(s.engine).keywordAmount(s.perm("belowTotalSecurity"), "SecurityAttack")).toBe(0);

    const reduced = setupEngine({
      0: { battleArea: [{ card: "EX5-033", as: "mitamamon" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-010", as: "nowQualifying" }], security: ["BT1-011", "BT1-012"] },
    });
    reduced.state.turnSeat = 1;
    await reduced.ready();
    await settle(
      () => observe(reduced.engine).keywordAmount(reduced.perm("nowQualifying"), "SecurityAttack") === -2,
      2000,
    );
    expect(observe(reduced.engine).keywordAmount(reduced.perm("nowQualifying"), "SecurityAttack")).toBe(-2);
  });

  it("grants Barrier only to own yellow Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-033", as: "mitamamon" },
          { card: "BT1-045", as: "yellow" },
          { card: "BT1-009", as: "red" },
        ],
      },
      1: { battleArea: [{ card: "BT1-045", as: "opponentYellow" }] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("mitamamon"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("yellow"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("red"), "Barrier")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentYellow"), "Barrier")).toBe(false);
  });
});
