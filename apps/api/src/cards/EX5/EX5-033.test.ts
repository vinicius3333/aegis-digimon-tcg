import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-033.js";

describe("EX5-033 Mitamamon", () => {
  it("can trash top security to play a yellow level four or lower Digimon and grant Rush", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        from: ["hand"],
        bindResultAs: "playedByThisEffect",
        cost: { kind: "trash", target: { filter: { zone: "security" }, position: "top" } },
      },
      {
        kind: "GainKeyword",
        target: { filter: { boundRef: "playedByThisEffect", kind: ["Digimon"] } },
        keyword: { keyword: "Rush" },
        duration: "forTheTurn",
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      bindResultAs: "playedByThisEffect",
    });
  });
  it("shares once-per-turn use between When Digivolving and When Attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
  });
  it("applies the opponent-turn Security Attack reduction only through that turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -2 },
      duration: "untilOpponentTurnEnd",
      target: { whileMatchesTargetFilter: true },
    });
    const opponentAction = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0];
    if (opponentAction?.kind !== "GainKeyword") throw new Error("EX5-033 opponent-turn effect missing");
    expect(opponentAction.target.filter.levelComparison).toMatchObject({
      op: "gte",
      value: { kind: "dynamicCount", filter: { zone: "security", controller: "any" } },
    });
  });

  it("gives every qualifying opposing Digimon Security Attack minus two during the opponent turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-033", as: "mitamamon" }], security: ["BT1-001", "BT1-002"] },
      1: {
        battleArea: [
          { card: "BT1-016", as: "qualifying" },
          { card: "BT1-010", as: "belowTotalSecurity" },
        ],
        security: ["BT1-003", "BT1-004"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await settle(() => observe(s.engine).keywordAmount(s.perm("qualifying"), "SecurityAttack") === -2, 2000);

    expect(observe(s.engine).keywordAmount(s.perm("qualifying"), "SecurityAttack")).toBe(-2);
    expect(observe(s.engine).keywordAmount(s.perm("belowTotalSecurity"), "SecurityAttack")).toBe(0);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("belowTotalSecurity"), "SecurityAttack") === -2, 2000);

    // The level-4 Digimon remains qualified when the live threshold drops from 4 to 3;
    // the level-3 Digimon newly joins it (KB Q3597-Q3599).
    expect(observe(s.engine).keywordAmount(s.perm("qualifying"), "SecurityAttack")).toBe(-2);
    expect(observe(s.engine).keywordAmount(s.perm("belowTotalSecurity"), "SecurityAttack")).toBe(-2);
  });

  it("trashes security to play a yellow level-four Digimon with Rush on public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-058", as: "base" }],
          hand: [
            { card: "EX5-033", as: "mitamamon" },
            { card: "BT1-045", as: "played" },
          ],
          security: ["BT1-009"],
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
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("shares the digivolving and attacking play effect once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-058", as: "base" }],
          hand: [
            { card: "EX5-033", as: "mitamamon" },
            { card: "BT1-045", as: "first" },
            { card: "BT1-047", as: "second" },
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
    const securityAfterDigivolve = s.state.players[0]!.security.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("base"));
    await settle();

    expect(s.state.players[0]!.security.length).toBe(securityAfterDigivolve);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-047");
  });

  it("grants Barrier to every own yellow Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-033", as: "mitamamon" },
          { card: "BT1-045", as: "yellow" },
          { card: "BT1-009", as: "red" },
        ],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("yellow"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("red"), "Barrier")).toBe(false);
  });
});
