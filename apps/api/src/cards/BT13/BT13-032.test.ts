import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-032.js";

describe("BT13-032 JumboGamemon", () => {
  it("keeps Blocker and the level-5 stack-play trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    }));
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "OpponentsTurn",
      actions: [expect.objectContaining({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [
        {
          kind: "PlayWithoutCost",
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
        },
      ],
      })],
    }));
  });

  it("plays a level 5 card from its own stack when the opponent attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-032", as: "jumbo", under: ["BT13-031", "BT13-027"] }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "attacker" }], security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-027"),
      3000,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-027")).toBe(true);
    expect(s.perm("jumbo").stack.map(({ cardId }) => cardId)).toEqual(["BT13-031"]);
  });

  it("allows the controller to decline playing a source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-032", as: "jumbo", under: ["BT13-027"] }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-015", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));

    expect(s.perm("jumbo").stack.map(({ cardId }) => cardId)).toEqual(["BT13-027"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("uses Blocker to redirect an attack and delete the weaker attacker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker", dp: 5000 }] },
        1: { battleArea: [{ card: "BT13-032", as: "jumbo" }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("jumbo"), "Blocker")).toBe(true);
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("jumbo").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(false);
    expect(s.perm("jumbo").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("digivolves for 5 from both blue and black level-5 Digimon", async () => {
    for (const baseCard of ["AD1-011", "BT10-013"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "BT13-032", as: "jumbo" }],
        },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("jumbo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT13-032");
      expect(s.state.memory).toBe(0);
    }
  });
});
