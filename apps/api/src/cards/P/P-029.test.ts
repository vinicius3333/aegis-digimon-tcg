import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-113.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT3/BT3-109.js";
import "../BT5/BT5-086.js";
import "../BT5/BT5-109.js";
import "./P-029.js";

describe("P-029 Agunimon", () => {
  it("shows an optional AncientGreymon confirmation and can decline without scheduling deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-029", as: "promoAgunimon" }],
        hand: [{ card: "BT4-113", as: "ancientGreymon" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 3;
    const permanentId = s.perm("promoAgunimon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("P-029");
    expect(decision.kind).toBe("optional");

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);

    expect(s.perm("promoAgunimon").topCard.cardId).toBe("P-029");
    expect(s.state.memory).toBe(3);
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("endOfTurn", permanentId)).toHaveLength(0);
  });

  it("reduces only an AncientGreymon digivolution from its own host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "host", under: ["P-029"] }],
        hand: [{ card: "BT4-113", as: "ancientGreymon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("ancientGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT4-113");

    expect(s.state.memory).toBe(7);
  });

  it("does not reduce an unrelated digivolution from its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-025", as: "host", under: ["P-029"] }],
        hand: [{ card: "BT5-086", as: "omnimon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT5-086");

    expect(s.state.memory).toBe(6);
  });

  it("digivolves into AncientGreymon while attacking and deletes that Digimon at end of turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-029", as: "promoAgunimon" }],
          hand: [{ card: "BT4-113", as: "ancientGreymon" }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-028", "BT1-028", "BT1-048"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("ancientGreymon").instanceId);
    s.state.memory = 3;
    const permanentId = s.perm("promoAgunimon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.permanentId === permanentId && permanent.topCard?.cardId === "BT4-113",
        ) && !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );

    expect(s.state.memory).toBe(1);
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("endOfTurn", permanentId)).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("endOfTurn");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT4-113")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "P-029")).toBe(true);
  });

  it("still deletes the same Digimon after AncientGreymon digivolves again (Q4138)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-029", as: "promoAgunimon" }],
          hand: [
            { card: "BT4-113", as: "ancientGreymon" },
            { card: "BT5-086", as: "omnimon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("ancientGreymon").instanceId);
    s.state.memory = 10;
    const permanentId = s.perm("promoAgunimon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("promoAgunimon").topCard.cardId === "BT4-113" &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("promoAgunimon").topCard.cardId === "BT5-086");
    await advance(s.engine).fireSubTrigger("endOfTurn");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-086")).toBe(true);
  });
});

describe("P-029 Agunimon — KB Q&A rulings", () => {
  async function attackIntoAncientGreymon(
    extraHand: { card: string; as: string }[],
    extraField: string,
    options: { preferTriggerKeys?: string[] },
    duringMain: (s: ReturnType<typeof setupEngine>) => Promise<void>,
    beforeAttack: (s: ReturnType<typeof setupEngine>) => Promise<void> = async () => {},
  ) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-029", as: "agunimon" }, { card: extraField }],
          hand: [{ card: "BT4-113", as: "ancientGreymon" }, ...extraHand],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: ["BT1-009", "BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderTriggers: true,
        declineDigiXros: true,
        ...options,
      },
    );
    s.state.memory = 10;
    const permanentId = s.perm("agunimon").permanentId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await beforeAttack(s);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("agunimon").topCard.cardId === "BT4-113" &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    await duringMain(s);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    return { s, permanentId };
  }

  for (const { first, triggerKey, omnimonEndsIn } of [
    { first: "P-029", triggerKey: "Delete this Digimon", omnimonEndsIn: "trash" },
    { first: "BT5-109", triggerKey: "return the Digimon that digivolved", omnimonEndsIn: "deckBottom" },
  ] as const) {
    it(`lets the turn player order the deletion and Mega Digimon Fusion!'s return; ${first} first wins (Q4139)`, async () => {
      const { s, permanentId } = await attackIntoAncientGreymon(
        [
          { card: "BT5-109", as: "fusion" },
          { card: "BT5-086", as: "omnimon" },
        ],
        "BT12-098",
        { preferTriggerKeys: [triggerKey] },
        async (s) => {
          expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fusion").instanceId })).toEqual({
            ok: true,
          });
          await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT5-109"));
          expect(
            s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("agunimon").permanentId,
              instanceId: s.inst("omnimon").instanceId,
            }),
          ).toEqual({ ok: true });
          await settle(() => s.perm("agunimon").topCard.cardId === "BT5-086" && s.state.pendingDecision === undefined);
        },
      );

      const player = s.state.players[0]!;
      const endOfTurnOrder = s.decisions.find(
        ({ req }) => req.kind === "orderTriggers" && req.options?.timing === "OnEndTurn",
      );
      expect(endOfTurnOrder?.seat).toBe(0);
      expect(endOfTurnOrder?.req.options?.triggerKeys).toHaveLength(2);
      expect(player.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(false);
      const omnimonId = s.inst("omnimon").instanceId;
      if (omnimonEndsIn === "trash") {
        expect(player.trash.some((card) => card.instanceId === omnimonId)).toBe(true);
      } else {
        expect(player.deck.at(-1)?.instanceId).toBe(omnimonId);
      }
    });
  }

  it("re-plays [AncientGreymon], the card on top when deleted, through Back for Revenge! (Q4140)", async () => {
    const { s, permanentId } = await attackIntoAncientGreymon(
      [{ card: "BT3-109", as: "revenge" }],
      "BT2-067",
      {},
      async () => {},
      async (s) => {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revenge").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-109"));
      },
    );

    const player = s.state.players[0]!;
    expect(player.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(false);
    expect(player.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(s.inst("ancientGreymon").instanceId);
    expect(player.trash.some((card) => card.cardId === "P-029")).toBe(true);
  });
});
