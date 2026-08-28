import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-062.js";
import "./BT2-082.js";

describe("BT2 Diaboromon historical deck gauntlet", () => {
  it("reduces evolution, then creates and sacrifices its token in a security battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-062", as: "infermon" }],
          hand: [{ card: "BT2-082", as: "classicDiaboromon" }],
          deck: ["BT1-001"],
        },
        1: {
          security: ["BT1-084", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("infermon").permanentId,
        instanceId: s.inst("classicDiaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("infermon").topCard.instanceId === s.inst("classicDiaboromon").instanceId &&
        s.state.memory === 0 &&
        s.state.pendingDecision === undefined,
    );

    expect(advance(s.engine).ledgers.subTriggers.replacementsFor("wouldBeDeleted")).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("infermon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4 && !observe(s.engine).isAttacking());

    // Q1034: the token made before the security battle may replace this deletion.
    expect(s.perm("infermon").topCard.instanceId).toBe(s.inst("classicDiaboromon").instanceId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "TOKEN-Diaboromon")).toBe(false);
    // Tokens cease to exist when leaving the battle area; they never enter the trash.
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "TOKEN-Diaboromon")).toBe(false);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-084")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(4);
    assertNoLoudGap(s);
  });
});
