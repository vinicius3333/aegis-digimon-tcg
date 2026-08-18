import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
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
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("bastemon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;

    expect(decision.sourceCardId).toBe("P-093");
    expect(decision.options?.min).toBe(1);
    expect(decision.options?.max).toBe(1);
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      s.perm("target").permanentId,
      s.perm("otherTarget").permanentId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
    })).toEqual({ ok: true });
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
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ally").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
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
          battleArea: [{ card: "BT1-075", as: "host", under: ["P-093"] }],
          hand: [
            { card: "BT1-080", as: "level6" },
            { card: "BT4-090", as: "level7" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("level6").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("level6").instanceId);
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("level7").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("level7").instanceId);

    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });
});
