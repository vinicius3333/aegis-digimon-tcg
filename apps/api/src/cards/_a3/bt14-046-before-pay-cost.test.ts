import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT14/BT14-046.js";

describe("BT14-046 BeforePayCost A3 (HARD-03/HARD-04)", () => {
  it("pays by suspending an eligible green Digimon and reduces the green Tamer play cost by 3", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "BT1-009", as: "greenDigimon" },
          ],
          hand: [{ card: "BT1-089", as: "mimi" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("greenDigimon").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-089"));

    expect(s.state.memory).toBe(3);
    expect(s.perm("togemon").isSuspended || s.perm("greenDigimon").isSuspended).toBe(true);
  });

  it("keeps the full play cost when the controller declines the optional suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "BT1-009", as: "greenDigimon" },
          ],
          hand: [{ card: "BT1-089", as: "mimi" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-089"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("greenDigimon").isSuspended).toBe(false);
  });

  it("keeps the full play cost when no green Digimon can pay the suspension cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-046", as: "togemon", suspended: true }],
        hand: [{ card: "BT1-089", as: "mimi" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-089"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("togemon").isSuspended).toBe(true);
  });
});
