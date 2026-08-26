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
        0: { battleArea: [{ card: "BT13-034", as: "kudamon" }], deck: ["BT13-036", "BT13-098", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("kudamon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT13-036"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-036", "BT13-098"]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("does not add an off-color Vaccine or a yellow non-Vaccine Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-034", as: "kudamon" }],
          deck: [
            { card: "BT1-015", as: "rest-red" },
            { card: "BT13-035", as: "rest-yellow" },
            { card: "BT13-098", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    const resolution = advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("kudamon"));
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
    await resolution;

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT13-098"]);
    expect(s.state.players[0]!.deck.slice(-2).map(({ cardId }) => cardId)).toEqual(["BT13-035", "BT1-015"]);
  });

  it("the inherited effect sums both security stacks, debuffs an opponent, and is once per turn (Q2287)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-034"] }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.perm("target").currentDP === baseDP - 2000);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("the inherited debuff does not fire when the combined security total exceeds six", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-034"] }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-005", "BT1-006", "BT1-007"],
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
