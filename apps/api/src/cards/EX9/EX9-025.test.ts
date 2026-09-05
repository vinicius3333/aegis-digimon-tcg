import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-025.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { getEffectModule } from "../../engine/effects/registry.js";

describe("EX9-025", () => {
  it("has Training and once per turn may give an opposing Digimon -2000 DP by placing the deck's top card face-down underneath when attacking", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          optional: true,
          cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          scaling: { unit: "selfFaceDownDigivolutionCards" },
        },
      ],
    });
  });
  it("inherits Barrier", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Barrier",
      raw: "＜Barrier＞",
    }));

  it("places the deck top face down and reduces one opposing Digimon by the face-down count", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-025", as: "source" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    const target = s.perm("target");
    expect(getEffectModule("EX9-025")?.effectsForTiming(EffectTiming.OnUseAttack, source as never)).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "permanent", permanentId: target.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP !== 5000);

    expect(source.stack).toHaveLength(1);
    expect(source.stack.at(-1)!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(target.currentDP).toBe(3000);
  });

  it("does not use the opposing deck or resolve with an empty own deck", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-025", as: "source" }], deck: [] },
        1: { deck: ["BT1-009"], battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    const target = s.perm("target");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "permanent", permanentId: target.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.length > 0);

    expect(source.stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(target.currentDP).toBe(5000);
  });

  it.each([true, false])("pays inherited Barrier only when accepted after a legal evolution: %s", async (accept) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-025", as: "host" }],
        hand: [{ card: "BT1-057", as: "evo" }],
        deck: ["BT1-009"],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "ST1-10", as: "attacker" }] },
    });
    s.state.memory = 10;
    await s.ready();
    const host = s.perm("host");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(host.topCard.cardId).toBe("BT1-057");
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["EX9-025"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(8);
    host.isSuspended = true;
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: host.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(s.events.some(({ kind }) => kind === "barrierPrompt")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: host.permanentId, accept })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId)).toBe(accept);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(accept ? [] : ["BT1-001"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(
      accept ? ["BT1-001"] : ["EX9-025", "BT1-057"].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
