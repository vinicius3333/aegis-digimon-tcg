import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-101.js";

describe("BT5-101 You Can't Actually Fly?", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-101")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("suspends an opponent and trashes their top security when they control a level 7", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-101", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT5-085", as: "level7" },
            { card: "BT5-047", as: "other" },
          ],
          security: [{ card: "BT5-001", as: "top" }, "BT5-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("level7").isSuspended && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT5-002"]);
    expect(s.perm("level7").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.perm("level7").controllerSeat).toBe(1);
  });

  it("does not trash security without an opposing level 7", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-101", as: "option" }] },
        1: { battleArea: [{ card: "BT5-047", as: "target" }], security: ["BT5-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not win when the level 7 condition is met but the security stack is empty", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-101", as: "option" }] },
        1: { battleArea: [{ card: "BT5-085", as: "level7" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("level7").isSuspended);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.gameOver).toBe(false);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-101", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});

describe("BT5-101 You Can't Actually Fly? — KB Q&A rulings", () => {
  const playAgainstLevel7 = async (security: string[]) => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-101", as: "option" }] },
        1: { battleArea: [{ card: "BT5-085", as: "level7" }], security },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("level7").isSuspended);
    await settle();
    return s;
  };

  it("does not win the game when the opponent has a level 7 Digimon but no security cards (Q1375)", async () => {
    const control = await playAgainstLevel7(["BT5-001"]);
    expect(control.state.players[1]!.security).toHaveLength(0);
    expect(control.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT5-001");
    expect(control.state.gameOver).toBe(false);

    const s = await playAgainstLevel7([]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.gameOver).toBe(false);
    expect(s.state.winnerSeat).toBe(-1);
    expect(s.events.some((event) => event.kind === "gameOver")).toBe(false);
    expect(s.state.turnSeat).toBe(0);
  });
});
