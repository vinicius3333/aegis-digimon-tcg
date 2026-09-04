import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-068.js";

describe("EX2-068 High-Speed Plug-In D", () => {
  it("gives one Digimon Jamming for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-014", as: "target" }, "EX2-060"],
          hand: [{ card: "EX2-068", as: "option" }],
          deck: ["EX2-031"],
        },
        1: { security: ["EX2-015"], deck: ["EX2-032"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("target"), "Jamming") &&
        observe(s.engine).isRestricted(s.perm("target"), "cantBeBlocked"),
    );
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Jamming")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeBlocked")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(true);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Jamming")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeBlocked")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
    assertNoLoudGap(s);
  });

  it("waives the blue color requirement only while a Tamer is in play", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-019"], hand: [{ card: "EX2-068", as: "option" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("waives the blue color requirement with a Tamer even when no blue card is in play", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX2-019", "EX2-060"], hand: [{ card: "EX2-068", as: "option" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("does not open a block window against a Blocker when the target has the unblockable effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-014", as: "target" }, "EX2-060"], hand: [{ card: "EX2-068", as: "option" }] },
        1: { battleArea: [{ card: "EX2-031", as: "blocker" }], security: ["BT1-001"], deck: ["BT1-002"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cantBeBlocked"));
    const blockWindowsBefore = s.events.filter(({ kind }) => kind === "blockWindowOpened").length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);
    expect(s.events.filter(({ kind }) => kind === "blockWindowOpened").length).toBe(blockWindowsBefore);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
