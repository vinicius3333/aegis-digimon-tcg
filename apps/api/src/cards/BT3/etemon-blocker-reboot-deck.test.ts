import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-070.js";
import "./BT3-071.js";
import "./BT3-074.js";
import "./BT3-106.js";

describe("BT3 Etemon Blocker/Reboot deck", () => {
  it("grants both qualifying lanes, then lapses only where digivolution removes the keyword", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-070", as: "etemon" },
            { card: "BT3-071", as: "metalMamemon" },
          ],
          hand: [
            { card: "BT3-106", as: "cyclone" },
            { card: "BT3-074", as: "metalEtemon" },
          ],
        },
        1: {
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: ["BT1-004"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyclone").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("etemon"), "SecurityAttack") === 1 &&
        observe(s.engine).keywordAmount(s.perm("metalMamemon"), "SecurityAttack") === 1,
    );
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalMamemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("etemon").permanentId,
        instanceId: s.inst("metalEtemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("etemon").topCard?.cardId === "BT3-074");
    await settle();

    expect(observe(s.engine).keywordAmount(s.perm("etemon"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("metalMamemon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("etemon"), "cantBeBlocked")).toBe(true);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("etemon").currentDP).toBe(s.perm("etemon").baseDP + 2000);
  });
});
