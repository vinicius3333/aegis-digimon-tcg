import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-132.js";

describe("P-132 Galemon", () => {
  it("suspends one Digimon as cost and gains +2000 DP when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "base" },
            { card: "BT1-065", as: "cost" },
          ],
          hand: [{ card: "P-132", as: "galemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("galemon").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("galemon").instanceId);
    expect(s.perm("cost").isSuspended).toBe(true);
    expect(s.perm("base").currentDP).toBe(7000);
    assertNoLoudGap(s);
  });

  it("grants Piercing to Galemon while Shoto Kazama is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-132", as: "galemon" },
          { card: "P-133", as: "shoto" },
        ],
      },
    });
    s.state.phase = Phase.Main;
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("galemon"))).toBe(true);
  });

  it("applies the inherited +2000 DP during your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-064", as: "host", under: ["P-132"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });
});
