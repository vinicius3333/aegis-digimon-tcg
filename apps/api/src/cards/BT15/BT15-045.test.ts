import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-045.js";

describe("BT15-045", () => {
  it("suspends an opposing Digimon on play and when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Suspend" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }] });
  });
  it("gains 1 memory once per turn when a green Tamer is played", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));

  it("suspends exactly one opposing Digimon when played", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT15-045", as: "palmon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended, 1_500);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("gains one memory for the first green Tamer played by an inherited host each turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-078", as: "host", under: ["BT15-045"] }],
        hand: [
          { card: "BT1-088", as: "firstTamer" },
          { card: "BT1-088", as: "secondTamer" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstTamer").instanceId),
    );
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondTamer").instanceId),
    );
    expect(s.state.memory).toBe(7);
  });

  it("digivolves legally from a green level-2 Digi-Egg and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "egg" },
        hand: [{ card: "BT15-045", as: "palmon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("palmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard?.cardId === "BT15-045");

    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT1-007"]);
  });
});
