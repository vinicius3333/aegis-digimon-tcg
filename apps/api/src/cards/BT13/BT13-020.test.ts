import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-020.js";

describe("BT13-020 ShineGreymon: Burst Mode", () => {
  it("is fully represented in compiled IR with the printed Burst Digivolve requirement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["ShineGreymon", "Marcus Damon"], cost: 0, isAlternate: true },
    ]);
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

  it("trashes only one top opposing security card across two Tamer suspensions on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-020", as: "burst" },
          { card: "BT12-092", as: "marcus" },
        ],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("marcus").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("marcus").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not trash security for an allied Tamer suspension on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-020", as: "burst" },
          { card: "BT12-092", as: "marcus" },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("marcus").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
