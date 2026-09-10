import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/EX7/EX7-023.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  if (!s.state.gameOver && !s.engine.applyIntent(0, { type: "surrender" }).ok) {
    throw new Error("failed to stop the turn loop");
  }
  await loop;
}

describe("source-relative continuous restrictions", () => {
  it("re-evaluates an all-target source-count restriction after the target evolves", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-023", as: "hex", under: ["BT1-028"] }], deck: ["BT1-028"] },
      1: {
        battleArea: [{ card: "BT1-037", as: "target", under: ["BT1-028"] }],
        hand: [{ card: "BT1-038", as: "evolved" }],
        deck: ["BT1-028", "BT1-028"],
      },
    });
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);

    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-038");

    // The target now has more sources than Hexeblaumon, so the live predicate must reopen it.
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.phase).toBe(Phase.Main);
    await stopLoop(s, loop);
  });
});
