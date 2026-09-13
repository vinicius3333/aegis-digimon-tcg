import { describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

describe("inherited Blocker source and host changes", () => {
  it("uses an inherited Blocker through a public opponent-turn block window", async () => {
    cite("comprehensive-0221", "Blocker is an optional block declaration that suspends the blocking Digimon");
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-053", as: "host", under: ["EX5-051"] }] },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 3000 }], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("loses inherited Blocker when a public legal evolution changes the host", async () => {
    cite("comprehensive-0221", "Blocker is supplied by the inherited effect of the source card");
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-053", as: "host", under: ["EX5-051"] },
            { card: "EX5-051", as: "blockerWitness" },
          ],
          hand: [{ card: "BT5-087", as: "zwart" }],
          security: ["BT1-014"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 3000 }],
          security: ["BT1-014"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("zwart").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT5-087");
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId }),
    ).toMatchObject({
      ok: false,
    });
    expect(observe(s.engine).isAttacking()).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toMatchObject({ ok: true });
    await loop;
  });
});
