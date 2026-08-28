import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-082.js";

describe("BT18-082 Lucemon: Chaos Mode", () => {
  it("covers opponent choice, recovery fallback, and once-per-turn replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Delete", controller: "opponent", optional: true },
        { kind: "SecurityManipulation", op: "addTop", condition: { kind: "ifThisEffectDidNotDelete" } },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
  });

  it("naturally resolves the On Play fallback when the opponent declines deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-082", as: "chaos" }], deck: ["BT1-001"], security: ["BT1-002"] },
        1: { security: ["BT1-003"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-003")).toBe(true);
  });

  it("naturally resolves only the opponent deletion branch when that choice deletes a permanent", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-082", as: "chaos" }], deck: ["BT1-001"], security: ["BT1-002"] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-003")).toBe(false);
  });

  it("naturally resolves the When Digivolving fallback from Lucemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-034", as: "lucemon" }],
          hand: [{ card: "BT18-082", as: "chaos" }],
          deck: ["BT1-001"],
          security: ["BT1-002"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("lucemon").permanentId,
      instanceId: s.inst("chaos").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("lucemon").topCard?.cardId === "BT18-082");

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-003")).toBe(true);
  });

  it("naturally trashes its owner's bottom security to prevent leaving play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-082", as: "chaos" }], security: ["BT1-001", "BT1-002"] },
        1: { hand: [{ card: "BT18-019", as: "millenniummon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 14;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("millenniummon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.perm("chaos")).toBeDefined();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
  });
});
