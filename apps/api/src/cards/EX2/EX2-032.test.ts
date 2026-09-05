import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-032.js";
import "./EX2-034.js";
import "./EX2-062.js";
import "./EX2-063.js";

describe("EX2-032 Strikedramon", () => {
  it("adds a black Tamer from the top four when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-030", as: "base" }],
          hand: [{ card: "EX2-032", as: "evolution" }],
          deck: ["BT1-012", { card: "EX2-062", as: "tamer" }, "BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });

  it("puts the other revealed cards at the bottom in the chosen order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-030", as: "base" }],
          hand: [{ card: "EX2-032", as: "evolution" }],
          deck: [
            { card: "BT1-012", as: "drawn" },
            { card: "EX2-062", as: "tamer" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.kind).toBe("orderCards");
    expect(ordering.options?.candidateInstanceIds).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    const chosenOrder = [s.inst("third").instanceId, s.inst("first").instanceId, s.inst("second").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: chosenOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === chosenOrder.join(","),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(chosenOrder);
  });

  it("does not add a card when the reveal has no black Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-030", as: "base" }],
        hand: [{ card: "EX2-032", as: "evolution" }],
        deck: ["BT1-012", "BT1-009", "BT1-010", "BT1-011", "BT1-013"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 4);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX2-062")).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("gains 1 memory from its inherited effect with two black Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-034", as: "host", under: ["EX2-032"] }, "EX2-062", "EX2-063"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(4);
  });

  it("does not gain memory from its inherited effect with fewer than two black Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-034", as: "host", under: ["EX2-032"] }, "EX2-062"] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(3);
  });
});
