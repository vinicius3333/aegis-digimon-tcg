import { describe, expect, it } from "vitest";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT18-050.js";

describe("BT18-050 Petaldramon", () => {
  it("unsuspends the exact qualifying level-4 Vegetation Digimon on play", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      { 0: { hand: [{ card: "BT18-050", as: "petaldramon" }], battleArea: [{ card: "BT18-047", as: "vegetation", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("vegetation").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petaldramon").instanceId })).toEqual({ ok: true });
    await s.ready();
    await settle(() => !s.perm("vegetation").isSuspended);

    expect(s.perm("vegetation").isSuspended).toBe(false);
  });
});
