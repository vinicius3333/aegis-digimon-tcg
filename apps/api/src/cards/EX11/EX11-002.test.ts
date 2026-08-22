import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-002.js";
import "../index.js";

describe("EX11-002 inherited unsuspended-attack permission", () => {
  it("allows the host Digimon to attack an unsuspended opponent Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    await settle(() => s.perm("host").attackablePermanentIds.includes(s.perm("target").permanentId), 400);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
  });
});
