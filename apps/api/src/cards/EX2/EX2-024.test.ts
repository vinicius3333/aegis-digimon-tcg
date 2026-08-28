import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-024.js";

describe("EX2-024 Sakuyamon", () => {
  it("unsuspends a Digimon and returns one Plug-In Option per Tamer when digivolving", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-023", as: "base", suspended: true },
            { card: "EX2-019", as: "ally", suspended: true },
            "EX2-060",
          ],
          hand: [{ card: "EX2-024", as: "evolution" }],
          trash: [{ card: "EX2-066", as: "plugin" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        (!s.perm("ally").isSuspended || !s.perm("base").isSuspended) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId),
    );
    expect([s.perm("ally").isSuspended, s.perm("base").isSuspended]).toContain(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId)).toBe(true);
  });
});
