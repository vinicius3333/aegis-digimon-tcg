import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-045.js";

describe("BT2-045 Argomon", () => {
  it("may suspend a Digimon to reduce its digivolution cost by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "cost" },
            { card: "BT2-043", as: "base" },
          ],
          hand: [{ card: "BT2-045", as: "argomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("argomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("cost").isSuspended);

    expect(s.state.memory).toBe(3);
    expect(s.perm("cost").isSuspended).toBe(true);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("pays the full cost without prompting when no allied Digimon can be suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-043", as: "base", suspended: true },
          { card: "BT1-010", as: "other", suspended: true },
        ],
        hand: [{ card: "BT2-045", as: "argomon" }],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("argomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-045");

    expect(s.state.memory).toBe(1);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("asks for confirmation and pays the full cost when Digisorption is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-043", as: "base" },
          { card: "BT1-010", as: "cost" },
        ],
        hand: [{ card: "BT2-045", as: "argomon" }],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("argomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-045");
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.perm("cost").isSuspended).toBe(false);
  });
});
