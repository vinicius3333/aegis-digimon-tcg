import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-011.js";

describe("BT8-011 Cyclonemon", () => {
  it("deletes an opposing 2000-DP-or-lower Digimon when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-011"] }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete an opposing Digimon with 2001 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-011"] }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target", dp: 2001 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("digivolves for 2 from both red and black level-3 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-008", as: "redBase" },
          { card: "BT8-060", as: "blackBase" },
        ],
        hand: [
          { card: "BT8-011", as: "redEvolution" },
          { card: "BT8-011", as: "blackEvolution" },
        ],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("redEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackBase").permanentId,
        instanceId: s.inst("blackEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("redBase").topCard.instanceId).toBe(s.inst("redEvolution").instanceId);
    expect(s.perm("blackBase").topCard.instanceId).toBe(s.inst("blackEvolution").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
