import { describe, expect, it } from "vitest";
import type { Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

async function answerOptional(s: EngineSetup, cardId: string, accept: boolean) {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  const { seat, req } = s.decisions.at(-1)!;
  expect(req).toMatchObject({ kind: "optional", sourceCardId: cardId });
  expect(s.state.pendingDecision?.decisionId).toBe(req.decisionId);
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
  await settle();
  return req;
}

describe("GitHub #5348 — SeitenGokuumon attack contract", () => {
  it.each([1, 0] as const)(
    "finishes seat %s's blocked Kotenken attack without a nested SeitenGokuumon attack",
    async (seat) => {
      const opponent = (1 - seat) as Seat;
      const triggerOrder = ["EX12-045"];
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "EX12-034", as: "erlang" },
              { card: "TOKEN-Kotenken", as: "token" },
            ],
            hand: [
              { card: "EX12-045", as: "sanzo" },
              { card: "EX12-048", as: "seiten" },
            ],
            security: ["EX12-006", "EX12-006", "EX12-006", "EX12-006"],
          },
          [opponent]: { battleArea: [{ card: "BT22-041", as: "kentauros" }], security: ["BT1-009"] },
        },
        { autoSelectCards: true, preferTriggerKeys: triggerOrder },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const tokenId = s.perm("token").permanentId;
      const seitenId = s.inst("seiten").instanceId;
      expect(
        s.engine.applyIntent(seat, {
          type: "attack",
          attackerPermanentId: tokenId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.combatWindow?.kind === "block");
      expect(
        s.engine.applyIntent(opponent, {
          type: "declareBlock",
          blockerPermanentId: s.perm("kentauros").permanentId,
        }),
      ).toEqual({ ok: true });
      await answerOptional(s, "BT22-041", false);
      await answerOptional(s, "EX12-034", true);
      await answerOptional(s, "EX12-045", true);
      // Match the logged choice: resolve Erlangmon's return before SeitenGokuumon.
      triggerOrder.splice(0, 1, "EX12-034");
      await answerOptional(s, "EX12-045", true);
      const req = s.decisions.at(-1)!.req;
      expect(req).toMatchObject({
        sourceCardId: "EX12-048",
        kind: "optional",
        promptText: "Another attack cannot start while this attack is resolving.",
        options: { promptKey: "attackAlreadyResolving", selectionContext: "attackSource" },
      });
      expect(s.events.filter((event) => event.kind === "attackEnded")).toHaveLength(0);
      await answerOptional(s, "EX12-048", true);
      await settle(() => s.events.some((event) => event.kind === "attackEnded"));
      expect(s.events.filter((event) => event.kind === "cardPlayed")).toEqual([
        expect.objectContaining({ cardId: "EX12-045", seat }),
        expect.objectContaining({ cardId: "EX12-048", seat }),
      ]);
      expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
        expect.objectContaining({ attackerPermanentId: tokenId, attackerCardId: "TOKEN-Kotenken", seat }),
      ]);
      expect(s.events.filter((event) => event.kind === "attackEnded")).toEqual([
        expect.objectContaining({ attackerPermanentId: tokenId, seat }),
      ]);
      expect(s.state.players[seat]!.battleArea.find((p) => p.topCard.instanceId === seitenId)?.isSuspended).toBe(false);
      expect(s.state.players[seat]!.battleArea.some((p) => p.permanentId === tokenId)).toBe(false);
      expect(s.state.players[opponent]!.security).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.state.combatWindow).toBeUndefined();
    },
  );

  it.each(["play", "digivolve"] as const)("allows the optional %s attack with no DP target", async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: mode === "digivolve" ? [{ card: "EX12-029", as: "base", enteredThisTurn: true }] : [],
          hand: [{ card: "EX12-048", as: "seiten" }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    const instanceId = s.inst("seiten").instanceId;
    expect(
      s.engine.applyIntent(
        0,
        mode === "play"
          ? { type: "playCard", instanceId }
          : { type: "digivolve", instanceId, permanentId: s.perm("base").permanentId },
      ),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const source = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === instanceId)!;
    expect(source.enterFieldTurnCount).toBe(s.state.turnCount);
    const req = await answerOptional(s, "EX12-048", true);
    expect(req.options?.promptKey).toBeUndefined();
    await advance(s.engine).finishAttack();
    await settle();
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
      expect.objectContaining({ attackerCardId: "EX12-048" }),
    ]);
    expect(s.events.filter((event) => event.kind === "attackEnded")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(source.isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])(
    "retains DP reduction when the digivolving source is suspended=%s and attack is declined or illegal",
    async (suspended) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX12-029", as: "base", suspended }],
            hand: [{ card: "EX12-048", as: "seiten" }],
            deck: ["BT1-009"],
          },
          1: { battleArea: [{ card: "BT22-041", as: "target" }], security: ["BT1-009"] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const originalDP = s.perm("target").currentDP;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          instanceId: s.inst("seiten").instanceId,
          permanentId: s.perm("base").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.perm("target").currentDP).toBe(originalDP - 11000);
      await answerOptional(s, "EX12-048", suspended);
      expect(s.perm("target").currentDP).toBe(originalDP - 11000);
      expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
      expect(s.perm("base").isSuspended).toBe(suspended);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
});
