import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-044.js";
import "./EX2-071.js";

describe("EX2-071 Death Slinger", () => {
  it("deletes an opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["EX2-044"], hand: [{ card: "EX2-071", as: "option" }] }, 1: { battleArea: ["EX2-019"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("raises the level boundary by one only after each complete ten cards in trash", async () => {
    const below = setupEngine(
      {
        0: {
          battleArea: ["EX2-044"],
          hand: [{ card: "EX2-071", as: "option" }],
          trash: Array.from({ length: 9 }, () => "BT1-001"),
        },
        1: { battleArea: [{ card: "EX2-023", as: "level5" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    below.state.memory = 10;
    expect(below.engine.applyIntent(0, { type: "playCard", instanceId: below.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => below.state.pendingDecision === undefined);
    expect(below.state.players[1]!.battleArea).toHaveLength(1);

    const at = setupEngine(
      {
        0: {
          battleArea: ["EX2-044"],
          hand: [{ card: "EX2-071", as: "option" }],
          trash: Array.from({ length: 10 }, () => "BT1-001"),
        },
        1: { battleArea: [{ card: "EX2-023", as: "level5" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    at.state.memory = 10;
    expect(at.engine.applyIntent(0, { type: "playCard", instanceId: at.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => at.state.players[1]!.battleArea.length === 0);
    expect(at.state.players[1]!.battleArea).toHaveLength(0);

    const nineteen = setupEngine(
      {
        0: {
          battleArea: ["EX2-044"],
          hand: [{ card: "EX2-071", as: "option" }],
          trash: Array.from({ length: 19 }, () => "BT1-001"),
        },
        1: { battleArea: [{ card: "EX2-029", as: "level6" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    nineteen.state.memory = 10;
    expect(
      nineteen.engine.applyIntent(0, { type: "playCard", instanceId: nineteen.inst("option").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => nineteen.state.pendingDecision === undefined);
    expect(nineteen.state.players[1]!.battleArea).toHaveLength(1);

    const twenty = setupEngine(
      {
        0: {
          battleArea: ["EX2-044"],
          hand: [{ card: "EX2-071", as: "option" }],
          trash: Array.from({ length: 20 }, () => "BT1-001"),
        },
        1: { battleArea: [{ card: "EX2-029", as: "level6" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    twenty.state.memory = 10;
    expect(twenty.engine.applyIntent(0, { type: "playCard", instanceId: twenty.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => twenty.state.players[1]!.battleArea.length === 0);
    expect(twenty.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("gains 1 memory when an EX2-071 is directly trashed from the deck", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-044", as: "miller" }], deck: [{ card: "EX2-071", as: "trashed" }, "BT1-001"] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("miller").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashed").instanceId) &&
        s.state.memory === 4,
    );
    expect(s.state.memory).toBe(4);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX2-071", as: "securityOption", faceUp: true }] },
      1: { battleArea: ["EX2-019"] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
