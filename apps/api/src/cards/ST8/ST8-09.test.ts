import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST4/ST4-08.js";
import "./ST8-05.js";
import "./ST8-09.js";

describe("ST8-09 Slayerdramon", () => {
  it("gains Security Attack +1 for the turn when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST8-08", as: "base" }], hand: [{ card: "ST8-09", as: "slayer" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("slayer").instanceId,
      }),
    ).toEqual({ ok: true });
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

describe("ST8-09 Slayerdramon — KB Q&A rulings", () => {
  async function attackIntoBlocker(attackerCardId: string) {
    const s = setupEngine({
      0: { battleArea: [{ card: attackerCardId, as: "attacker" }] },
      1: { battleArea: [{ card: "ST4-08", as: "blocker" }], security: ["ST8-03"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("prevents the opponent from redirecting its attack with <Blocker> (Q703)", async () => {
    const unblockable = await attackIntoBlocker("ST8-09");
    await settle(() => !observe(unblockable.engine).isAttacking(), 3000);
    expect(unblockable.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(unblockable.perm("blocker").isSuspended).toBe(false);
    expect(unblockable.state.players[1]!.security).toHaveLength(0);

    const blockable = await attackIntoBlocker("ST8-05");
    await settle(() => blockable.events.some((event) => event.kind === "blockWindowOpened"));
    expect(blockable.events).toContainEqual(
      expect.objectContaining({
        kind: "blockWindowOpened",
        eligibleBlockerIds: [blockable.perm("blocker").permanentId],
      }),
    );
    expect(
      blockable.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: blockable.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(blockable.engine).isAttacking(), 3000);
    expect(blockable.state.players[1]!.security).toHaveLength(1);
  });
});
