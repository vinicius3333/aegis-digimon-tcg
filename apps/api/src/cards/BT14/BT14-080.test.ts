import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-080.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-080", () => {
  it("once per turn trashes the opponent's deck based on own trash count on digivolution or attack", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(
        compiled.effects?.find((entry) => entry.trigger === trigger && entry.actions[0]?.kind === "TrashTopDeck"),
      ).toMatchObject({
        frequency: "OncePerTurn",
        actions: [{ kind: "TrashTopDeck", controller: "opponent", amount: 3, scaling: { per: 10, unit: "trash" } }],
      });
  });
  it("once per turn gains Security Attack +1 when the opponent has ten cards in trash", () =>
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && entry.actions[0]?.kind === "GainKeyword"),
    ).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "SecurityAttack", amount: 1 },
          condition: { kind: "zoneCount", value: 10 },
        },
      ],
    }));
  it("naturally digivolves, mills once across triggers, and grants Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-079", as: "base" }],
          hand: [{ card: "BT14-080", as: "source" }],
          trash: Array(10).fill("BT1-009"),
          deck: ["BT1-010"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"], trash: Array(10).fill("BT1-009") },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-080" && s.state.players[1]!.trash.length === 13);
    expect(s.perm("base").topCard?.cardId).toBe("BT14-080");
    expect(s.state.players[1]!.trash.length).toBe(13);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.length === 13 &&
        observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack") === 1,
    );
    expect(s.state.players[1]!.trash.length).toBe(13);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
  });

  it("resets both attack once-per-turn effects on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-079", as: "base" }],
          hand: [{ card: "BT14-080", as: "source" }, "BT1-009"],
          trash: Array(10).fill("BT1-009"),
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          hand: ["BT1-009"],
          trash: Array(10).fill("BT1-009"),
          deck: Array(20).fill("BT1-009"),
          security: Array(6).fill("BT1-091"),
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-080" && s.state.players[1]!.trash.length === 13);
    expect(s.state.players[1]!.trash).toHaveLength(13);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4);
    expect(s.state.players[1]!.deck).toHaveLength(17);
    expect(s.state.players[1]!.trash).toHaveLength(15);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(0);
    s.state.turnSeat = 0;
    s.state.memory = 10;

    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.deck.length === 13 &&
        s.state.players[1]!.security.length === 2 &&
        observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack") === 1,
    );
    expect(s.state.players[1]!.deck).toHaveLength(13);
    expect(s.state.players[1]!.trash).toHaveLength(20);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
