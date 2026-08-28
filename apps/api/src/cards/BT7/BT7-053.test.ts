import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT7-053.js";

describe("BT7-053 Dinorexmon", () => {
  it("binds the unsuspend restriction to the Digimon it suspended", () => {
    const actions = runtimeCompiledCard("BT7-053")?.effects[0]?.actions;

    expect(actions).toHaveLength(2);
    expect(actions?.[1]).toMatchObject({
      kind: "Restrict",
      target: { sameTarget: true },
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
    });
  });

  it("suspends one opposing Digimon and prevents that same Digimon from unsuspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT7-053", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "ST1-02", as: "target" },
            { card: "ST1-02", as: "other" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-053"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
