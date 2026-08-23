import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-099.js";

describe("BT2-099 Glorious Burst", () => {
  it("reduces its use cost by 1 for each yellow Tamer in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-087", "BT1-087"], hand: [{ card: "BT2-099", as: "option" }] },
        1: { battleArea: [{ card: "BT2-050", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-099"));
    expect(s.state.memory).toBe(3);
  });

  it("pays the full 9 memory with no yellow Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-033"], hand: [{ card: "BT2-099", as: "option" }] },
        1: { battleArea: [{ card: "BT1-062", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-099"));

    expect(s.state.memory).toBe(0);
  });

  it("counts only the controller's yellow Tamers for the use-cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-087", "BT2-085", "BT2-033"],
          hand: [{ card: "BT2-099", as: "option" }],
        },
        1: { battleArea: ["BT1-087", { card: "BT1-062", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-099"));

    expect(s.state.memory).toBe(1);
  });

  it("reduces an opposing Digimon by 12000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-033", "BT2-087"], hand: [{ card: "BT2-099", as: "option" }] },
        1: { battleArea: [{ card: "BT2-045", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("applies the full -12000 DP to exactly one selected opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT2-033"], hand: [{ card: "BT2-099", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT2-083", as: "first", dp: 13000 },
          { card: "BT2-083", as: "second", dp: 13000 },
        ],
      },
    });
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("first").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").currentDP === 1000);

    expect(s.perm("first").currentDP).toBe(1000);
    expect(s.perm("second").currentDP).toBe(13000);
  });
});
