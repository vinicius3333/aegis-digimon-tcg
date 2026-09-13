import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-093.js";

describe("P-093 Bastemon", () => {
  it("suspends exactly 1 opponent Digimon when Bastemon itself attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-093", as: "bastemon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-010", as: "otherTarget" },
          ],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bastemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;

    expect(decision.sourceCardId).toBe("P-093");
    expect(decision.options?.min).toBe(1);
    expect(decision.options?.max).toBe(1);
    expect(decision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("target").permanentId, s.perm("otherTarget").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended && s.state.pendingDecision === undefined);

    expect(s.perm("target").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not trigger when a different allied Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-093", as: "bastemon" },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target" }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").isSuspended && s.state.pendingDecision === undefined);

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.decisions.filter((entry) => entry.req.sourceCardId === "P-093")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("reduces only the first digivolution cost of its inherited host each turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-080", as: "host", under: ["P-093"] }],
          hand: [
            { card: "BT13-059", as: "firstExamon" },
            { card: "BT13-059", as: "secondExamon" },
            { card: "BT13-059", as: "thirdExamon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const sourceId = s.perm("host").stack[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("firstExamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("firstExamon").instanceId);
    expect(s.state.memory).toBe(7);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);

    await (
      s.engine as unknown as { primitives: { deDigivolve: (id: string, n: number) => Promise<void> } }
    ).primitives.deDigivolve(s.perm("host").permanentId, 1);
    await settle(() => s.perm("host").topCard?.cardId === "BT1-080");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("secondExamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("secondExamon").instanceId);
    expect(s.state.memory).toBe(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await (
      s.engine as unknown as { primitives: { deDigivolve: (id: string, n: number) => Promise<void> } }
    ).primitives.deDigivolve(s.perm("host").permanentId, 1);
    await settle(() => s.perm("host").topCard?.cardId === "BT1-080");
    const memoryBeforeResetTrigger = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("thirdExamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("thirdExamon").instanceId);
    expect(s.state.memory).toBe(memoryBeforeResetTrigger - 3);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
