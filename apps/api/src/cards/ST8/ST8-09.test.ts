import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST4/ST4-08.js";
import "./ST8-09.js";

describe("ST8-09 Slayerdramon", () => {
  it("gains Security Attack +1 for the turn when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST8-08", as: "base" }], hand: [{ card: "ST8-09", as: "slayer" }] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("slayer").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack") === 1);
  });

  it("cannot be blocked on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST8-09", as: "slayer" }] },
      1: { battleArea: [{ card: "ST4-08", as: "blocker" }], security: ["ST8-03"] },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("slayer"), "cantBeBlocked")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("slayer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });
});
