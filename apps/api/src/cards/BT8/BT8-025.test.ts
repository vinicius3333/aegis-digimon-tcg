import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-025.js";

describe("BT8-025 Hookmon", () => {
  it("trashes the bottom source of an opposing Digimon when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-030", as: "host", under: ["BT8-025"] }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-042", as: "target", under: ["BT8-003", "BT8-034"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const bottomId = s.perm("target").stack.at(-1)!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId));
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("does nothing when no opposing Digimon has digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-030", as: "host", under: ["BT8-025"] }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "sourceFree" }] },
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
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("digivolves for 2 from both blue and black level-3 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-021", as: "blueBase" },
          { card: "BT8-060", as: "blackBase" },
        ],
        hand: [
          { card: "BT8-025", as: "blueEvolution" },
          { card: "BT8-025", as: "blackEvolution" },
        ],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("blueEvolution").instanceId,
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

    expect(s.perm("blueBase").topCard.instanceId).toBe(s.inst("blueEvolution").instanceId);
    expect(s.perm("blackBase").topCard.instanceId).toBe(s.inst("blackEvolution").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
