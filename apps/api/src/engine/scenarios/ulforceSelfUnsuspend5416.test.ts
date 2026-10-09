import { expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

it("#5416: EX13-023 self-unsuspends and continues its unblocked player attack", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "EX13-023", as: "ulforce", under: ["EX13-022"] }], deck: ["BT1-009", "BT1-009"] },
      1: { security: ["BT1-009", "BT1-009"], deck: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
  );
  await s.ready();
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ulforce").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("ulforce").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
