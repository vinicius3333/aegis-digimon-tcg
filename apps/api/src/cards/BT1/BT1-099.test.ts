import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-099.js";

describe("BT1-099 Hearts Attack", () => {
  it("lets the UI distinguish identical Digimon and trashes every source of the selected one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "ownLoaded", under: ["BT1-001"] }],
          hand: [{ card: "BT1-099", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "emptyTarget" },
            {
              card: "BT2-047",
              as: "loadedTarget",
              under: ["BT1-001", "BT1-002", "BT1-003"],
            },
          ],
        },
      },
      { autoSelectCards: false },
    );
    const loadedSourceIds = [...s.perm("loadedTarget").stack].map(({ instanceId }) => instanceId);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT1-099");
    expect(decision.options?.min).toBe(1);
    expect(decision.options?.max).toBe(1);
    expect(decision.options?.candidateInstanceIds).toEqual([
      s.perm("emptyTarget").permanentId,
      s.perm("loadedTarget").permanentId,
    ]);
    // GameScreen derives sourceCount from this synchronized permanent state while
    // the decision is open, so identical artwork is exposed as 0 versus 3 sources.
    expect(s.perm("emptyTarget").stack).toHaveLength(0);
    expect(s.perm("loadedTarget").stack).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("loadedTarget").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("loadedTarget").stack.length === 0);

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(loadedSourceIds),
    );
    expect(s.perm("emptyTarget").stack).toHaveLength(0);
    expect(s.perm("ownLoaded").stack).toHaveLength(1);
  });

  it("Q964 legally resolves against an empty stack without touching the other Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-028"],
          hand: [{ card: "BT1-099", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "emptyTarget" },
            {
              card: "BT2-047",
              as: "loadedTarget",
              under: ["BT1-001", "BT1-002", "BT1-003"],
            },
          ],
        },
      },
      { autoSelectCards: false },
    );
    const optionInstanceId = s.inst("option").instanceId;
    const loadedSourceIds = [...s.perm("loadedTarget").stack].map(({ instanceId }) => instanceId);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: optionInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("emptyTarget").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionInstanceId));

    expect([...s.perm("loadedTarget").stack].map(({ instanceId }) => instanceId)).toEqual(loadedSourceIds);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
