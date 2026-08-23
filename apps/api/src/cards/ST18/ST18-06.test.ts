import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST18-06 Kiwimon", () => {
  it("suspends an opponent Digimon on play and exposes the Vegetation rule trait", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST18-06", as: "kiwimon" }] }, 1: { battleArea: [{ card: "ST18-03", as: "victim" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kiwimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").isSuspended);

    expect(s.perm("victim").isSuspended).toBe(true);
    const kiwimon = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "ST18-06");
    expect(kiwimon).toBeDefined();
    expect(observe(s.engine).hasEffectiveTrait(kiwimon!, "Vegetation")).toBe(true);
  });

  it("suspends an opponent Digimon again when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-06", as: "kiwimon" }] },
        1: { battleArea: [{ card: "ST18-03", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("kiwimon").permanentId], "byEffect");
    await settle(() => s.perm("victim").isSuspended);

    expect(s.perm("victim").isSuspended).toBe(true);
  });
});
