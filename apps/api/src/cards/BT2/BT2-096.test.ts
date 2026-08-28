import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-096.js";

describe("BT2-096 The Ray of Victory", () => {
  it("returns an opposing level 5 or lower Digimon and unsuspends yours with a blue Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-021", as: "mine", suspended: true }, "BT2-085"],
          hand: [{ card: "BT2-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT2-045", as: "target", under: [{ card: "BT2-043", as: "source" }] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((c) => c.cardId === "BT2-045") && !s.perm("mine").isSuspended);
    expect(s.state.players[1]!.hand.some((c) => c.cardId === "BT2-045")).toBe(true);
    expect(s.perm("mine").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.perm("mine").topCard.instanceId,
      ),
    ).toBe(true);
  });

  it("does not return an opposing level 6 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-021", as: "mine", suspended: true }, "BT2-085"],
        hand: [{ card: "BT2-096", as: "option" }],
      },
      1: { battleArea: [{ card: "BT2-032", as: "levelSix" }] },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("mine").isSuspended);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("does not unsuspend without a blue Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-021", as: "mine", suspended: true }],
          hand: [{ card: "BT2-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT2-045"));

    expect(s.perm("mine").isSuspended).toBe(true);
  });

  it("does not treat a non-blue Tamer as satisfying the Then condition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-021", as: "mine", suspended: true }, "BT2-084"],
          hand: [{ card: "BT2-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT2-045"));

    expect(s.perm("mine").isSuspended).toBe(true);
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT2-096", as: "securityOption", faceUp: true }],
          battleArea: [{ card: "BT2-021", as: "mine", suspended: true }, "BT2-085"],
        },
        1: { battleArea: [{ card: "BT2-045", as: "target", under: [{ card: "BT2-043", as: "source" }] }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT2-045")).toBe(true);
    expect(s.perm("mine").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });
});
