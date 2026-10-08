import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import "../cards/index.js";

describe("granted Start of Main attack visibility (Discord 1557600224011096104)", () => {
  it.each([
    ["EX12-016", "playCard", "EX12-011"],
    ["EX12-016", "digivolve", "EX12-011"],
    ["BT12-065", "digivolve", "BT12-060"],
    ["BT23-056", "playCard", "BT23-041"],
    ["BT23-056", "digivolve", "BT23-041"],
    ["BT25-054", "playCard", "BT25-050"],
    ["BT25-054", "digivolve", "BT25-050"],
  ] as const)("%s via %s publishes the recipient's badge and granted clause", async (card, type, base) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card, as: "source" }],
          battleArea: [{ card: base, as: "base" }, "BT22-083"],
          deck: Array(10).fill("BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-021", as: "recipient" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(
        0,
        type === "playCard"
          ? { type, instanceId: s.inst("source").instanceId }
          : { type, instanceId: s.inst("source").instanceId, permanentId: s.perm("base").permanentId },
      ),
    ).toEqual({ ok: true });
    await settle();
    expect.soft(s.perm("recipient").attacksAtStartOfMainPhase).toBe(true);
    expect.soft(s.perm("recipient").grantedEffectTexts.join(" ")).toContain("[Start of Your Main Phase]");
    expect(s.perm("base").attacksAtStartOfMainPhase).toBe(false);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
  });

  it("labels the mandatory attack target decision with the granted timing, not the installing On Play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-016", as: "source" }], security: ["BT1-011"], deck: Array(10).fill("BT1-009") },
        1: { battleArea: [{ card: "BT1-021", as: "recipient" }], deck: Array(10).fill("BT1-009") },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const { seat, req } = s.decisions.at(-1)!;
    expect(seat).toBe(1);
    expect(req).toMatchObject({ kind: "selectCards", sourcePermanentId: s.perm("recipient").permanentId });
    expect(req.options).toMatchObject({ min: 1, max: 1, timing: "[Start of Your Main Phase]" });
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "selectCards", instanceIds: ["player"] },
      }),
    ).toEqual({ ok: true });
    await settle();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });
});
