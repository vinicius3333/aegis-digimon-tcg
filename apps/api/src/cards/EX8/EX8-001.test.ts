import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-001.js";

describe("EX8-001", () => {
  it("inherits a once-per-turn attack deletion against an opposing Digimon with 3000 DP or less when it has Tyrannomon or Dinosaur", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { count: 1, filter: { dp: { op: "lte", value: 3000 } } },
          condition: { kind: "anyOf" },
        },
      ],
    }));

  it("deletes an opposing 3000 DP Digimon when the inherited host has the Dinosaur trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-001"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.includes(target));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("deletes an opposing Digimon when the inherited host has Tyrannomon in its name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-024", as: "host", under: ["EX8-001"] }] },
      1: { battleArea: [{ card: "BT1-011", as: "target" }] },
    });
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.includes(target));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-011")).toBe(true);
  });

  it("does not delete a 5000 DP Digimon at the inherited threshold", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "AD1-001", as: "host", under: ["EX8-001"] },
          { card: "BT1-009", as: "ownTarget" },
        ],
      },
      1: { battleArea: [{ card: "AD1-001", as: "target" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("ownTarget").permanentId),
    ).toBe(true);
  });

  it("deletes only once per turn and does nothing for a non-Tyrannomon non-Dinosaur host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-001", as: "qualifying", under: ["EX8-001"], dp: 20_000 },
            { card: "BT1-010", as: "nonqualifying", under: ["EX8-001"] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target1", suspended: true },
            { card: "BT1-009", as: "target2", suspended: true },
            { card: "BT1-011", as: "target3", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const attack = (attacker: "qualifying" | "nonqualifying") =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "player" as const },
      });

    expect(attack("qualifying")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("qualifying").permanentId]);
    expect(attack("qualifying")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    expect(attack("nonqualifying")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("carries the inherited deletion through a legal hatch, evolution stack, and move to battle", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["EX8-001"],
          deck: ["BT1-045", "BT1-045", "BT1-045", "BT1-045", "BT1-045"],
          hand: [
            { card: "EX8-007", as: "agumon" },
            { card: "AD1-001", as: "greymon" },
          ],
        },
        1: {
          deck: ["BT1-045", "BT1-045", "BT1-045", "BT1-045", "BT1-045"],
          security: ["BT1-045", "BT1-045"],
          battleArea: [
            { card: "BT1-009", as: "target1" },
            { card: "BT1-009", as: "target2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    const firstTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.players[0]!.breeding?.topCard.cardId === "EX8-001");
    const egg = s.state.players[0]!.breeding!;

    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: egg.permanentId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => egg.topCard.cardId === "EX8-007");
    expect(egg.stack.map((card) => card.cardId)).toEqual(["EX8-001"]);
    expect(s.state.memory).toBe(0);

    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: egg.permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => egg.topCard.cardId === "AD1-001");
    expect(egg.stack.map((card) => card.cardId)).toEqual(["EX8-001", "EX8-007"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const secondTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await secondTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const thirdTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: egg.permanentId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.players[0]!.battleArea.length === 1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: egg.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await thirdTurn;

    // A fresh production turn clears the inherited Once Per Turn ledger.
    s.state.memory = 0;
    const fourthTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0 && s.state.turnCount === 4);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: egg.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await fourthTurn;
  });
});
