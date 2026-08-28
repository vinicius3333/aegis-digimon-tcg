import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-003.js";
import "../index.js";

describe("BT16-003", () => {
  it("has inherited Blocker during the opponent's turn when it has two colors", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      keywords: [{ keyword: "Blocker" }],
      condition: { kind: "selfColorCount", value: 2 },
    }));

  it("grants Blocker to a multicolor host during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-003"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Blocker")).toBe(true);
  });

  it("does not grant Blocker to a one-color host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-006", as: "host", under: ["BT16-003"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Blocker")).toBe(false);
  });

  it("uses the inherited Blocker in a natural opponent attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-007", as: "blocker", under: ["BT16-003"] }],
        security: ["BT16-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 1000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("blocker").permanentId],
    });

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("blocker").isSuspended);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
