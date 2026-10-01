import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-086.js";
import "./BT3-092.js";
import "../BT2/BT2-007.js";

describe("BT3-086 Arukenimon", () => {
  it("may pay 3 memory to play MaloMyotismon from hand, then deletes itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-086", as: "arukenimon", under: ["BT3-083"] }],
          hand: [{ card: "BT3-092", as: "maloMyotismon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const sourceId = s.perm("arukenimon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourceId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const activation = s.decisions.at(-1)!.req;
    expect(activation.sourceCardId).toBe("BT3-086");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT3-092") &&
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === sourceId) &&
        s.state.memory === 3,
      5000,
    );

    expect(s.state.memory).toBe(3);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });
});

describe("BT3-086 Arukenimon — KB Q&A rulings", () => {
  const DECK = ["BT1-009", "BT1-013", "BT1-009"];

  function attackWithArukenimon(options: { preferTriggerKeys?: string[]; autoDeclineOptional?: boolean }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-086", as: "arukenimon", under: ["BT2-007"] }],
          hand: [{ card: "BT3-092", as: "maloMyotismon" }],
          deck: [{ card: "BT1-013", as: "deckTop" }, ...DECK],
        },
        1: { security: ["BT1-011"], deck: [...DECK] },
      },
      {
        autoSelectCards: true,
        declineDigiXros: true,
        autoAcceptOptional: options.autoDeclineOptional !== true,
        autoDeclineOptional: options.autoDeclineOptional,
        preferTriggerKeys: options.preferTriggerKeys,
      },
    );
    s.state.memory = 5;
    const attackerId = s.perm("arukenimon").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    return { s, attackerId };
  }

  const inBattleArea = (s: ReturnType<typeof setupEngine>, cardId: string) =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId);

  it("lets the player decline the [When Attacking] effect, keeping Arukenimon and memory (Q1102)", async () => {
    const { s, attackerId } = attackWithArukenimon({ autoDeclineOptional: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 0, 5000);

    const offer = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-086");
    expect(offer).toBeDefined();
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT3-092"]);
    expect(inBattleArea(s, "BT3-092")).toBe(false);
    expect(s.state.memory).toBe(5);
  });

  it("cannot activate an inherited [When Attacking] effect after Arukenimon's effect deletes it, but can before (Q1104)", async () => {
    const arukenimonFirst = attackWithArukenimon({ preferTriggerKeys: ["BT3-086"] });
    await settle(
      () =>
        inBattleArea(arukenimonFirst.s, "BT3-092") &&
        !arukenimonFirst.s.state.players[0]!.battleArea.some(
          ({ permanentId }) => permanentId === arukenimonFirst.attackerId,
        ) &&
        arukenimonFirst.s.state.pendingDecision === undefined,
      5000,
    );
    await drainMicrotasks();
    const simultaneousOffer = arukenimonFirst.s.decisions.find(({ req }) => req.kind === "orderTriggers")?.req;
    expect(simultaneousOffer?.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT3-086", "BT2-007"]));
    expect(arukenimonFirst.s.state.players[0]!.deck).toHaveLength(DECK.length + 1);
    expect(arukenimonFirst.s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT1-013");

    const inheritedFirst = attackWithArukenimon({ preferTriggerKeys: ["BT2-007"] });
    await settle(
      () =>
        inBattleArea(inheritedFirst.s, "BT3-092") &&
        !inheritedFirst.s.state.players[0]!.battleArea.some(
          ({ permanentId }) => permanentId === inheritedFirst.attackerId,
        ) &&
        inheritedFirst.s.state.pendingDecision === undefined,
      5000,
    );
    expect(inheritedFirst.s.state.players[0]!.deck).toHaveLength(DECK.length);
    expect(inheritedFirst.s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      inheritedFirst.s.inst("deckTop").instanceId,
    );
  });

  it("gains 1 memory from the played MaloMyotismon when Arukenimon deletes itself (Q1105)", async () => {
    const { s, attackerId } = attackWithArukenimon({});
    await settle(
      () =>
        inBattleArea(s, "BT3-092") &&
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId) &&
        s.state.pendingDecision === undefined,
      5000,
    );
    await settle(() => s.state.memory === 3, 2000);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT3-086");
    expect(s.state.memory).toBe(5 - 3 + 1);
  });
});
