import "../BT1/BT1-036.js";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-034.js";

describe("BT13-034 Kudamon", () => {
  it("reveals three cards, adds the two yellow categories, and bottoms the rest", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: { kind: ["Digimon"], colors: ["Yellow"], nameOrTrait: [{ match: "trait", tokens: ["Vaccine"] }] },
            },
            { count: 1, to: "hand", filter: { kind: ["Tamer"], colors: ["Yellow"] } },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
        },
      ],
    });
  });

  it("adds a yellow Vaccine and Tamer from the top three cards and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-034", as: "kudamon" }], deck: ["BT13-036", "BT13-098", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT13-036"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-036", "BT13-098"]),
    );
    await settle();
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(7);
  });

  it("does not add an off-color Vaccine or a yellow non-Vaccine Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-034", as: "kudamon" }],
          deck: [
            { card: "BT1-015", as: "rest-red" },
            { card: "BT13-035", as: "rest-yellow" },
            { card: "BT13-098", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    const order = s.decisions.find(({ req }) => req.kind === "orderCards")!.req;
    expect(order.options?.visibleCards?.map(({ cardId }) => cardId).sort()).toEqual(["BT1-015", "BT13-035"].sort());
    const exactOrder = [s.inst("rest-yellow").instanceId, s.inst("rest-red").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: exactOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();
    expect(s.state.memory).toBe(7);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT13-098"]);
    expect(s.state.players[0]!.deck.slice(-2).map(({ cardId }) => cardId)).toEqual(["BT13-035", "BT1-015"]);
  });

  it("the inherited effect sums both security stacks, debuffs an opponent, and is once per turn (Q2287)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: [{ card: "BT13-034", as: "source" }] }],
          hand: [
            { card: "BT1-036", as: "garuru" },
            { card: "BT1-010", as: "spare" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;
    const sourceId = s.inst("source").instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garuru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(4);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    expect(s.perm("target").currentDP).toBe(baseDP);
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
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("the inherited debuff does not fire when the combined security total exceeds six", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT13-034"] }],
          security: ["BT1-010", "BT1-009", "BT1-015", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-009", "BT1-015", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").currentDP).toBe(baseDP);
  });

  it("normally digivolves from a yellow level 2 for 0 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-006", as: "cupimon" }],
        hand: [{ card: "BT13-034", as: "kudamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cupimon").permanentId,
        instanceId: s.inst("kudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("cupimon").topCard.cardId === "BT13-034");
    expect(s.state.memory).toBe(3);
  });
});
