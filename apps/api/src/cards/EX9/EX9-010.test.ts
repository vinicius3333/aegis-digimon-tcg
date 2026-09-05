import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-010.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-010", () => {
  it("has Training and once per turn may place a card from hand face-down underneath to delete an opposing Digimon up to 4000 DP when digivolving or attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { filter: { dp: { op: "lte", value: 4000 } } },
      cost: { kind: "place", destination: "digivolutionStack", faceDown: true },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", optional: true }],
    });
  });
  it("inherits Raid", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Raid",
      raw: "＜Raid＞",
    }));

  it("places a hand card face-down underneath and deletes one opposing Digimon up to 4000 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-010", as: "source" }], hand: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "valid", dp: 4000 },
            { card: "BT1-011", as: "invalid", dp: 4001 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-011")).toBe(true);
  });

  it("places a hand card face-down underneath and deletes an opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-010", as: "source", under: ["EX9-007"] }], hand: ["BT1-009", "BT1-012"] },
        1: {
          battleArea: [{ card: "BT1-011", as: "attackTarget", dp: 3000, suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.perm("source").stack.some((card) => card.cardId === "BT1-009" && card.faceUp === false)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("shares its once-per-turn limit across digivolving and attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-007", as: "source" }],
          hand: [{ card: "EX9-010", as: "evo" }, "BT1-009", "BT1-012"],
        },
        1: {
          security: ["BT1-009"],
          battleArea: [
            { card: "BT1-010", as: "digivolvingTarget", dp: 3000 },
            { card: "BT1-011", as: "attackTarget", dp: 3000, suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("source").topCard?.cardId === "EX9-010" &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010"),
    );
    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.perm("source").stack.some((card) => card.cardId === "BT1-009" && card.faceUp === false)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.length === 0);

    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-011")).toBe(true);
  });

  it("inherits Raid through a legal EX9-007 to EX9-010 to neutral host stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-007", as: "base" }],
          hand: [
            { card: "EX9-010", as: "source" },
            { card: "ST1-09", as: "host" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "highest", dp: 9000 },
            { card: "BT1-010", as: "lower", dp: 4000 },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-010");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST1-09");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX9-007", "EX9-010"]);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-021") &&
        s.state.players[0]!.battleArea.length === 0,
    );
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-010"]);
  });
});
