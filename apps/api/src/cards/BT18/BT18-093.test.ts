import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-093.js";
import "../index.js";

describe("BT18-093 Violet Inboots", () => {
  it("covers memory setting, hand discard draw, and security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourTurn" });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Draw", amount: 1, cost: { kind: "trash" } }],
    });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", isSecurity: true });
  });

  it("sets memory to 3 naturally at the start of the turn from 2 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-093", as: "violet" }], deck: ["BT1-001"] } });
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).runTurn(0);

    // runTurn completes the turn and passes priority, normalizing memory.
    expect(s.state.memory).toBe(-3);
  });

  it.each([
    ["an Option", "BT1-090", "option"],
    ["a Ghost card", "BT11-078", "ghost"],
  ])("trashes %s to draw and gain memory at the natural start of main phase", async (_label, costCard, as) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-093", as: "violet" }],
          hand: [{ card: costCard, as }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst(as).instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.memory).toBe(-3);
  });

  it("does not set memory when the natural turn starts above 2 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-093", as: "violet" }], deck: ["BT1-001"] } });
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(-3);
  });

  it("plays itself from security through a natural security check", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT18-093", as: "violet" }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
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
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("violet").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("violet").instanceId)).toBe(
      true,
    );
  });
});
