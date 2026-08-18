import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-113.js";
import "./P-029.js";

describe("P-029 Agunimon", () => {
  it("shows an optional AncientGreymon confirmation and can decline without scheduling deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-029", as: "promoAgunimon" }],
        hand: [{ card: "BT4-113", as: "ancientGreymon" }],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 3;
    const permanentId = s.perm("promoAgunimon").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("P-029");
    expect(decision.kind).toBe("optional");

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
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

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("ancientGreymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT4-113");

    expect(s.state.memory).toBe(7); // Printed cost 5, reduced by 2.
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

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("omnimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT5-086");

    expect(s.state.memory).toBe(6); // Printed cost 4; AncientGreymon-only reduction must not apply.
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
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
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

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.permanentId === permanentId && permanent.topCard?.cardId === "BT4-113") &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );

    expect(s.state.memory).toBe(1);
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("endOfTurn", permanentId)).toHaveLength(1);
    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId)!;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, evolved);

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
        1: { security: ["BT1-001", "BT1-002"] },
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

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("promoAgunimon").topCard.cardId === "BT4-113" &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );
    await settle();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId,
      instanceId: s.inst("omnimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("promoAgunimon").topCard.cardId === "BT5-086");
    const evolvedAgain = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.permanentId === permanentId,
    )!;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, evolvedAgain);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-086")).toBe(true);
  });
});
