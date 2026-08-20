import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT21-049 Woodmon", () => {
  it("enters through the public play intent with its optional On Play effect registered", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT21-049", as: "woodmon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("woodmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("woodmon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("woodmon").instanceId)).toBe(true);
  });

  it("retains complete compiled coverage and Piercing as a keyword surface", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-049", as: "woodmon" }] } });
    await s.ready();
    expect(s.perm("woodmon").topCard?.cardId).toBe("BT21-049");
  });
});
