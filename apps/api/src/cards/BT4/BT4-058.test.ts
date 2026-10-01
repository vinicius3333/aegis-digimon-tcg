import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-058.js";
describe("BT4-058 Orochimon", () => {
  it("gives one of your Digimon Piercing for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-054", as: "base", under: ["BT4-004", "BT4-052"] }],
          hand: [{ card: "BT4-058", as: "evolving" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("base")));
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("BT4-058");
    expect(s.perm("base").stack).toHaveLength(3);
  });
});

describe("BT4-058 Orochimon — KB Q&A rulings", () => {
  it("can give Piercing to Orochimon itself (Q1214)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-054", as: "base", under: ["BT4-004", "BT4-052"] },
            { card: "BT4-053", as: "ally" },
          ],
          hand: [{ card: "BT4-058", as: "orochimon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    s.state.memory = 3;
    preferInstanceIds.push(s.perm("base").permanentId, s.inst("orochimon").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("orochimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("base")));

    const offeredTargets = s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredTargets).toEqual(expect.arrayContaining([s.perm("base").permanentId, s.perm("ally").permanentId]));
    expect(s.perm("base").topCard?.cardId).toBe("BT4-058");
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(false);
  });
});
