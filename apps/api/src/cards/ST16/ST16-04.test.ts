import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-04.js";

describe("ST16-04 Tapirmon inherited Retaliation", () => {
  it("deletes the battled opponent when the Retaliation host loses in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-02", as: "host", under: [{ card: "ST16-04" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST16-02")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
