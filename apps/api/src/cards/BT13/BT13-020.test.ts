import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-018.js";
import "../BT12/BT12-092.js";
import { compiled } from "./BT13-020.js";

describe("BT13-020 ShineGreymon: Burst Mode", () => {
  it("is fully represented in compiled IR with the printed Burst Digivolve requirement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["ShineGreymon"],
        cost: 0,
        isAlternate: true,
        burstDigivolve: { returnTamerNamesExact: ["Marcus Damon"] },
      },
    ]);
    expect(JSON.stringify(compiled)).not.toContain('"tokens":["Marcus Damon"],"match":"name"');
    expect(JSON.stringify(compiled)).toContain('"tokens":["Marcus Damon"],"match":"nameExact"');
  });

  it("plays and binds Marcus for the temporary 12000 DP Digimon treatment", () => {
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "GrantStatic",
              grant: "kind",
              staticEffect: { kind: "SetBaseDP", value: 12000, keyword: "Rush", restriction: "digivolve" },
            }),
          ]),
        }),
        expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"], payCost: false }),
      ]),
    );
  });

  it("does not accept a near-name Marcus Damon as the Burst Digivolve return cost", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-018", as: "shine" },
          { card: "AD1-021", as: "nearMarcus" },
        ],
        hand: [{ card: "BT13-020", as: "burst" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.battleArea).toContain(s.perm("nearMarcus"));
  });

  it("rejects a longer ShineGreymon name even when an exact Marcus Damon is payable", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-074", as: "ruinMode" },
          { card: "BT12-092", as: "marcus" },
        ],
        hand: [{ card: "BT13-020", as: "burst" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ruinMode").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.battleArea).toContain(s.perm("ruinMode"));
    expect(s.state.players[0]!.battleArea).toContain(s.perm("marcus"));
  });

  it("declares the once-per-turn allied Tamer suspension security effect", () => {
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({ event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Tamer"] } }),
          ],
        }),
      ]),
    );
  });

  it("executes Burst Digivolve, returns one Marcus, and plays the other as a temporary 12000 DP Digimon with Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "fieldMarcus" },
          ],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "handMarcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const fieldMarcusId = s.perm("fieldMarcus").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) =>
            permanent.topCard?.cardId === "BT12-092" &&
            permanent.permanentId !== fieldMarcusId &&
            permanent.currentDP === 12000,
        ),
      3000,
    );
    const playedMarcus = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "BT12-092" && permanent.permanentId !== fieldMarcusId,
    )!;
    expect(playedMarcus.currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(playedMarcus, "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(playedMarcus, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT12-092")).toHaveLength(1);

    const priorTopId = s.perm("shine").stack.at(-1)?.instanceId;
    expect(priorTopId).toBeDefined();
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.perm("shine").stack.some((card) => card.instanceId === priorTopId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === priorTopId)).toBe(true);
  });

  it("may decline to play Marcus Damon after a normal digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-018", as: "shine" }],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shine").topCard.cardId === "BT13-020");
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(5);
  });

  it("trashes one security before each fresh public Marcus attack, once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "firstMarcus" },
            { card: "BT12-092", as: "secondMarcus" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          security: [
            { card: "BT1-010", as: "securityOne" },
            { card: "BT1-011", as: "securityTwo" },
            { card: "BT1-012", as: "securityThree" },
            { card: "BT1-010", as: "securityFour" },
            { card: "BT1-011", as: "securityFive" },
            { card: "BT1-012", as: "securitySix" },
            { card: "BT1-010", as: "securitySeven" },
            { card: "BT1-011", as: "securityEight" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstMarcus").topCard.instanceId, s.perm("secondMarcus").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("firstMarcus").currentDP === 3000 && s.perm("secondMarcus").currentDP === 3000);
    expect(s.perm("firstMarcus").currentDP).toBe(3000);
    expect(s.perm("secondMarcus").currentDP).toBe(3000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 6 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityOne").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityTwo").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 5 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityThree").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("securityFour").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityFour").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("does not trash security for an allied Tamer suspension on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-020", as: "burst" },
          { card: "BT12-092", as: "marcus" },
        ],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("marcus").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
