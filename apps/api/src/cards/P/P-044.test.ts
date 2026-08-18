import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-044.js";

function digivolve(s: ReturnType<typeof setupEngine>): void {
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("source").instanceId,
    }),
  ).toEqual({ ok: true });
}

describe("P-044 HerculesKabuterimon", () => {
  it("can suspend 1 opponent Digimon regardless of its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", as: "base" }],
          hand: [{ card: "P-044", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "high", dp: 9000 }] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );

    digivolve(s);
    await settle(() => s.perm("high").isSuspended);

    expect(s.perm("high").isSuspended).toBe(true);
  });

  it("can choose to suspend exactly 2 opponent Digimon with 5000 DP or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", as: "base" }],
          hand: [{ card: "P-044", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low-a", dp: 5000 },
            { card: "BT1-009", as: "low-b", dp: 4000 },
            { card: "BT1-009", as: "high", dp: 6000 },
          ],
        },
      },
      {
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );

    digivolve(s);
    await settle(() => s.perm("low-a").isSuspended && s.perm("low-b").isSuspended);

    expect(s.perm("low-a").isSuspended).toBe(true);
    expect(s.perm("low-b").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
  });

  it("may choose the 1-target mode even when 2 low-DP targets exist", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", as: "base" }],
          hand: [{ card: "P-044", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low-a", dp: 5000 },
            { card: "BT1-009", as: "low-b", dp: 4000 },
          ],
        },
      },
      {
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 0,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("low-a").topCard!.instanceId);

    digivolve(s);
    await settle(() => s.perm("low-a").isSuspended);

    expect(s.perm("low-a").isSuspended).toBe(true);
    expect(s.perm("low-b").isSuspended).toBe(false);
  });

  it("Q4161: may suspend only 1 target in the 2-low-DP mode", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", as: "base" }],
          hand: [{ card: "P-044", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low-a", dp: 5000 },
            { card: "BT1-009", as: "low-b", dp: 4000 },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: false },
    );

    digivolve(s);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.filter(({ req }) => req.kind === "chooseTargets").at(-1)!.req;
    expect(decision.options?.candidateInstanceIds).toHaveLength(2);

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("low-a").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => s.perm("low-a").isSuspended);

    expect(s.perm("low-a").isSuspended).toBe(true);
    expect(s.perm("low-b").isSuspended).toBe(false);
  });
});
