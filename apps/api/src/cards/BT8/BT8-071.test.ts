import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-071.js";
import "./BT8-010.js";

describe("BT8-071 Psychemon", () => {
  it("prevents an opponent from reducing a Digimon's play cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-071", as: "psychemon" }] },
      1: { battleArea: ["BT8-008", "BT8-034"], hand: [{ card: "BT8-010", as: "aquilamon" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("aquilamon").instanceId,
      ),
    );
    expect(s.state.memory).toBe(0);
  });

  it("also prevents its owner from reducing a play cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-071", as: "psychemon" }, "BT8-008", "BT8-034"],
        hand: [{ card: "BT8-010", as: "aquilamon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("aquilamon").instanceId,
      ),
    );

    expect(s.state.memory).toBe(0);
  });

  it("digivolves from a purple level-2 Digimon for 0 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-008", as: "base" }], hand: [{ card: "BT8-071", as: "evolving" }] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-071");

    expect(s.perm("base").topCard.cardId).toBe("BT8-071");
    expect(s.state.memory).toBe(1);
  });
});
