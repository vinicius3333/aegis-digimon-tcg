import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-051.js";

describe("BT18-051 Entmon", () => {
  it("reduces a suspended qualifying level-6 Plant digivolution by exactly two memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-051", as: "entmon", suspended: true }], hand: [{ card: "EX3-045", as: "hydramon" }] },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("entmon").permanentId, instanceId: s.inst("hydramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("entmon").topCard?.cardId === "EX3-045");

    expect(s.perm("entmon").topCard?.cardId).toBe("EX3-045");
    expect(s.state.memory).toBe(7);

    const inactive = setupEngine({
      0: { battleArea: [{ card: "BT18-051", as: "entmon", suspended: false }], hand: [{ card: "EX3-045", as: "hydramon" }] },
    });
    await inactive.ready();
    inactive.state.memory = 10;
    expect(inactive.engine.applyIntent(0, { type: "digivolve", permanentId: inactive.perm("entmon").permanentId, instanceId: inactive.inst("hydramon").instanceId })).toEqual({ ok: true });
    await settle(() => inactive.perm("entmon").topCard?.cardId === "EX3-045");
    expect(inactive.state.memory).toBe(5);
  });
});
