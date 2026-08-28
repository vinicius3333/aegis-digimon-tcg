import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-055.js";

describe("BT14-055", () =>
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    })));

it("uses inherited Blocker in a natural attack block", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 1000 }], security: ["AD1-001"] },
    1: { battleArea: [{ card: "BT14-058", as: "host", dp: 2000, under: ["BT14-055"] }] },
  });
  await s.ready();
  const attackerId = s.perm("attacker").permanentId;
  const hostId = s.perm("host").permanentId;
  expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } })).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
  expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "blocked"));
  expect(s.perm("host").isSuspended).toBe(true);
});
