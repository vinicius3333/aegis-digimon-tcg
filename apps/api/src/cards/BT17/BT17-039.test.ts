import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-039.js";
import "../BT1/BT1-064.js";
import "../BT3/BT3-104.js";
import "../BT11/BT11-088.js";
import "../ST10/ST10-14.js";
import "./index.js";

describe("BT17-039 ShineGreymon", () => {
  it("may play Marcus Damon from hand when digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] },
        count: 1,
      },
    });
  });

  it("once per turn prevents opponent-effect removal by returning a yellow Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "return",
                target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
              },
            },
          ],
        },
      ],
    });
  });

  it("plays Marcus Damon without cost when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-037", as: "base" }],
          hand: [
            { card: "BT17-039", as: "shine" },
            { card: "AD1-021", as: "comboMarcus" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    const marcusId = s.inst("marcus").instanceId;
    preferred.push(marcusId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marcusId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("comboMarcus").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("returns a yellow Tamer to prevent an opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-039", as: "shine" },
            { card: "BT1-087", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const shineId = s.perm("shine").permanentId;
    const tamerId = s.perm("tamer").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([shineId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shineId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === tamerId)).toBe(true);
  });

  it("returns a yellow Tamer to prevent a natural opponent Option return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-039", as: "shine", suspended: true },
            { card: "BT1-087", as: "tamer" },
          ],
        },
        1: {
          battleArea: ["BT3-020", "BT1-064"],
          hand: [{ card: "BT3-104", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.ready();
    const shineId = s.perm("shine").permanentId;
    const tamerId = s.perm("tamer").topCard!.instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === tamerId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shineId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === tamerId)).toBe(true);
  });

  it("prevents only once per turn and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-039", as: "shine" },
            { card: "BT1-087", as: "firstTamer" },
            { card: "BT1-087", as: "secondTamer" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const shineId = s.perm("shine").permanentId;
    const firstTamerId = s.perm("firstTamer").topCard!.instanceId;
    const secondTamerId = s.perm("secondTamer").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([shineId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === firstTamerId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shineId)).toBe(true);

    await advance(s.engine).verb.deletePermanent([shineId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shineId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondTamerId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-039")).toBe(true);
  });

  it("resets the prevention on a later turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-039", as: "shine" },
            { card: "BT1-087", as: "firstTamer" },
            { card: "BT1-087", as: "secondTamer" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const shineId = s.perm("shine").permanentId;
    const firstTamerId = s.perm("firstTamer").topCard!.instanceId;
    const secondTamerId = s.perm("secondTamer").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([shineId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === firstTamerId));

    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    await advance(s.engine).verb.deletePermanent([shineId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === secondTamerId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shineId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-087")).toBe(false);
  });
});

describe("BT17-039 ShineGreymon — KB Q&A rulings", () => {
  it("treats trash, hand, deck, security and under-a-card moves by an opponent's effect as leaving the battle area (Q2791)", async () => {
    type Board = ReturnType<typeof setupEngine>;
    const inOpponentEffect = async (s: Board, move: () => Promise<unknown>) => {
      advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
      await move();
      advance(s.engine).verb.leaveEffectResolution();
    };
    const routes: Record<string, { opponentHand?: string; move: (s: Board) => Promise<unknown> }> = {
      trash: {
        move: (s) =>
          inOpponentEffect(s, () => advance(s.engine).verb.deletePermanent([s.perm("shine").permanentId], "byEffect")),
      },
      hand: {
        move: (s) => inOpponentEffect(s, () => advance(s.engine).verb.returnToHand([s.inst("shine").instanceId])),
      },
      deck: {
        move: (s) => inOpponentEffect(s, () => advance(s.engine).verb.returnToDeck([s.inst("shine").instanceId])),
      },
      security: {
        opponentHand: "ST10-14",
        move: async (s) => {
          expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentCard").instanceId })).toEqual({
            ok: true,
          });
          await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length > 0);
        },
      },
      underAnotherCard: {
        opponentHand: "BT11-088",
        move: async (s) => {
          expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentCard").instanceId })).toEqual({
            ok: true,
          });
          await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length > 0);
        },
      },
    };

    const outcomes: Record<string, { stayed: boolean; tamerReturned: boolean }> = {};
    for (const [route, { opponentHand, move }] of Object.entries(routes)) {
      const preferred: string[] = [];
      const opponentBattleArea: PermanentSpec[] = [{ card: "BT1-087" }, { card: "BT2-067" }];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT17-039", as: "shine" },
              { card: "BT1-087", as: "tamer" },
              { card: "BT1-010", as: "otherDigimon" },
            ],
            security: ["BT1-009"],
          },
          1: {
            battleArea: opponentBattleArea,
            hand: opponentHand === undefined ? [] : [{ card: opponentHand, as: "opponentCard" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
      );
      s.state.turnSeat = 1;
      s.state.memory = 15;
      await s.ready();
      preferred.push(s.inst("shine").instanceId);
      const shineId = s.perm("shine").permanentId;
      const tamerId = s.inst("tamer").instanceId;

      await move(s);
      await settle(() => s.state.pendingDecision === undefined);

      outcomes[route] = {
        stayed: s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shineId),
        tamerReturned: s.state.players[0]!.hand.some((card) => card.instanceId === tamerId),
      };
    }

    const prevented = { stayed: true, tamerReturned: true };
    expect(outcomes).toEqual({
      trash: prevented,
      hand: prevented,
      deck: prevented,
      security: prevented,
      underAnotherCard: prevented,
    });

    const ownEffect = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-039", as: "shine" },
            { card: "BT1-087", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await ownEffect.ready();
    advance(ownEffect.engine).verb.enterEffectResolution(0, ["Option"]);
    await advance(ownEffect.engine).verb.returnToDeck([ownEffect.inst("shine").instanceId]);
    advance(ownEffect.engine).verb.leaveEffectResolution();
    await settle(() => ownEffect.state.pendingDecision === undefined);

    expect(
      ownEffect.state.players[0]!.deck.some((card) => card.instanceId === ownEffect.inst("shine").instanceId),
    ).toBe(true);
    expect(
      ownEffect.state.players[0]!.hand.some((card) => card.instanceId === ownEffect.inst("tamer").instanceId),
    ).toBe(false);
  });
});
