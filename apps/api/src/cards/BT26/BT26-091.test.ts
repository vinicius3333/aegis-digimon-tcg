import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-091 Yoshino Fujieda", () => {
  it("requires the printed DATA SQUAD placement cost", async () => {
    const { getEffectModule } = await import("../../engine/effects/registry.js");
    const effect = getEffectModule("BT26-091")!.effectsForTiming(EffectTiming.OnStartMainPhase, {} as never)[0]!;
    expect(effect.optional).toBe(false);
  });

  it("places the DATA SQUAD cost face down at the bottom before drawing and gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-065", as: "dataSquadCost" }],
          deck: [{ card: "AD1-002", as: "drawn" }],
          battleArea: [
            {
              card: "BT26-091",
              as: "yoshino",
              under: [{ card: "AD1-001", faceUp: false, as: "existingBottom" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("dataSquadCost").instanceId;
    const existingId = s.inst("existingBottom").instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yoshino"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("yoshino").stack.map((card) => card.instanceId)).toEqual([costId, existingId]);
    expect(s.perm("yoshino").stack[0]!.faceUp).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("suspends itself and digivolves for 1 less when an opponent's permanent suspends", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-039", as: "sunflowmon" }],
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-036", as: "lalamon" },
          ],
        },
        1: { battleArea: [{ card: "AD1-003", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 1;

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 0);
    await settle(() => s.perm("lalamon").topCard?.instanceId === s.inst("sunflowmon").instanceId);

    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.perm("lalamon").topCard!.cardId).toBe("BT26-039");
    expect(s.state.memory).toBe(0);
  });

  it("still digivolves but pays the unreduced cost under Syakomon, per Q7148", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-039", as: "sunflowmon" }],
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-036", as: "lalamon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT5-021", as: "syakomon" },
            { card: "AD1-003", as: "opponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 0);
    await settle(() => s.perm("lalamon").topCard?.instanceId === s.inst("sunflowmon").instanceId);

    expect(s.perm("lalamon").topCard!.cardId).toBe("BT26-039");
    expect(s.state.memory).toBe(0);
  });

  it("does not react when one of its controller's own permanents suspends", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-039", as: "sunflowmon" }],
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-036", as: "lalamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("lalamon").permanentId], 0);
    await settle();

    expect(s.perm("yoshino").isSuspended).toBe(false);
    expect(s.perm("lalamon").topCard!.cardId).toBe("BT26-036");
  });

  it("plays itself from Security without paying the cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-091", as: "yoshinoSecurity" }] },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const yoshinoId = s.inst("yoshinoSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === yoshinoId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === yoshinoId)).toBe(true);
  });
});
