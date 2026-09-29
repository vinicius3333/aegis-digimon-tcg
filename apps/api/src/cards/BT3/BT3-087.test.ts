import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-087.js";
import "./BT3-092.js";
import "../BT2/BT2-007.js";

describe("BT3-087 Mummymon", () => {
  it("may pay 3 memory to play MaloMyotismon from trash, then deletes itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-087", as: "mummymon", under: ["BT3-083"] }],
          trash: [{ card: "BT3-092", as: "maloMyotismon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const sourceId = s.perm("mummymon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourceId,
        target: { kind: "player" },
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
  });

  it("declining the single activation keeps Mummymon in play and does not pay memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-087", as: "mummymon", under: ["BT3-083"] }],
          trash: [{ card: "BT3-092", as: "maloMyotismon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const sourceId = s.perm("mummymon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourceId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const activation = s.decisions.at(-1)!.req;
    expect(activation.sourceCardId).toBe("BT3-087");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT3-092")).toBe(true);
    expect(s.state.memory).toBe(5);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });
});

describe("BT3-087 Mummymon — KB Q&A rulings", () => {
  const DECK = ["BT1-009", "BT1-013", "BT1-009"];

  function attackWithMummymon(options: { preferTriggerKeys?: string[]; autoDeclineOptional?: boolean }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-087", as: "mummymon", under: ["BT2-007"] }],
          trash: [{ card: "BT3-092", as: "maloMyotismon" }],
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
    const attackerId = s.perm("mummymon").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    return { s, attackerId };
  }

  const inBattleArea = (s: ReturnType<typeof setupEngine>, cardId: string) =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId);

  const settleAfterMummymonResolves = ({ s, attackerId }: ReturnType<typeof attackWithMummymon>) =>
    settle(
      () =>
        inBattleArea(s, "BT3-092") &&
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId) &&
        s.state.pendingDecision === undefined,
      5000,
    );

  it("lets the player decline the [When Attacking] effect, keeping Mummymon and memory (Q1106)", async () => {
    const { s, attackerId } = attackWithMummymon({ autoDeclineOptional: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 0, 5000);

    const offer = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-087");
    expect(offer).toBeDefined();
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("maloMyotismon").instanceId);
    expect(inBattleArea(s, "BT3-092")).toBe(false);
    expect(s.state.memory).toBe(5);
  });

  it("cannot activate an inherited [When Attacking] effect after Mummymon's effect deletes it, but can before (Q1108)", async () => {
    const mummymonFirst = attackWithMummymon({ preferTriggerKeys: ["BT3-087"] });
    await settleAfterMummymonResolves(mummymonFirst);
    await drainMicrotasks();
    const simultaneousOffer = mummymonFirst.s.decisions.find(({ req }) => req.kind === "orderTriggers")?.req;
    expect(simultaneousOffer?.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT3-087", "BT2-007"]));
    expect(mummymonFirst.s.state.players[0]!.deck).toHaveLength(DECK.length + 1);
    expect(mummymonFirst.s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(
      mummymonFirst.s.inst("deckTop").instanceId,
    );

    const inheritedFirst = attackWithMummymon({ preferTriggerKeys: ["BT2-007"] });
    await settleAfterMummymonResolves(inheritedFirst);
    expect(inheritedFirst.s.state.players[0]!.deck).toHaveLength(DECK.length);
    expect(inheritedFirst.s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      inheritedFirst.s.inst("deckTop").instanceId,
    );
  });

  it("gains 1 memory from the played MaloMyotismon when Mummymon deletes itself (Q1109)", async () => {
    const attack = attackWithMummymon({});
    await settleAfterMummymonResolves(attack);
    await settle(() => attack.s.state.memory === 3, 2000);

    expect(attack.s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT3-087");
    expect(attack.s.state.memory).toBe(5 - 3 + 1);
  });
});
