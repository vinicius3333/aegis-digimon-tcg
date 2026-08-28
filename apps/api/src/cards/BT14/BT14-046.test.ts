import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-046.js";

describe("BT14-046", () => {
  it("registers the before-pay-cost suspend reduction and inherited green-Tamer evo reduction", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      amount: 3,
      cost: { kind: "suspend" },
    });
    expect(compiled.effects[1]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldDigivolve", amount: 1 }],
    });
  });

  it("naturally reduces only the first qualifying green Tamer play by suspending a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-046", as: "togemon" }, { card: "BT14-045", as: "other" }],
          hand: [{ card: "BT1-089", as: "firstMimi" }, { card: "BT1-089", as: "secondMimi" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstMimi").instanceId));
    expect(s.state.memory).toBe(9);
    expect(s.perm("togemon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondMimi").instanceId));
    expect(s.state.memory).toBe(5);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("naturally reduces an inherited host's evolution when a green Tamer is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-045", as: "host", under: ["BT14-046"] }, { card: "BT1-089", as: "mimi" }],
        hand: [{ card: "BT14-050", as: "piximon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("piximon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT14-050");
    expect(s.state.memory).toBe(8);
  });
});
