import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-114.js";

describe("P-114 Diaboromon", () => {
  it("plays a Diaboromon Token when digivolving and counts the token for deletion scaling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-064", as: "base" }], hand: [{ card: "P-114", as: "diaboromon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT22-071", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const lowId = s.perm("low").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("diaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.startsWith("TOKEN-")) &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.startsWith("TOKEN-"))).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT22-071")).toBe(true);
    assertNoLoudGap(s);
  });
});
