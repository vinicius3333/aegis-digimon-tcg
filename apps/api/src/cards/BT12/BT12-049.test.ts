import { expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-049.js";

it("provides Blocker as a public keyword", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT12-049", as: "yaki" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("yaki"), "Blocker")).toBe(true);
});

it("redirects a public opposing attack and suspends to block", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-049", as: "yaki" }] },
    1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
  });
  s.state.turnSeat = 1;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => observe(s.engine).blockingSeat() === 0);
  expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("yaki").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.perm("yaki").isSuspended).toBe(true);
});
