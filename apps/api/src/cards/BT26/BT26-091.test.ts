import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-091.js";
import "../index.js";

describe("BT26-091 compiled behavior", () => {
  it("matches Yoshino's catalog and compiled clauses", () => {
    expect(getCardDefinition("BT26-091")).toMatchObject({
      nameEn: "Yoshino Fujieda",
      colors: ["Green"],
      kinds: ["Tamer"],
      types: ["DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom", faceDown: true },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" }),
        expect.objectContaining({ kind: "SubTrigger", event: "whenDigivolutionTrashed" }),
      ]),
    );
  });

  it("publicly places DATA SQUAD at the bottom, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-091", as: "yoshino", under: [{ card: "BT1-009", as: "old", faceUp: false }] }],
          hand: [{ card: "BT26-044", as: "dataSquad" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("yoshino").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("dataSquad").instanceId,
      s.inst("old").instanceId,
    ]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declines the optional placement without changing hand or stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-091", as: "yoshino" }],
          hand: [{ card: "BT26-044", as: "dataSquad" }],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("yoshino").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("dataSquad").instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("retains both public reactive clauses in the compiled card", () => {
    const actions = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenSuspended", actions: [expect.objectContaining({ kind: "Digivolve" })] }),
        expect.objectContaining({
          event: "whenDigivolutionTrashed",
          actions: [expect.objectContaining({ kind: "Digivolve" })],
        }),
      ]),
    );
  });
});
