import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-078.js";

describe("BT2-078 WereGarurumon", () => {
  it("deletes another own Digimon to unsuspend its attacking host once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-079", as: "host", under: ["BT2-078"] },
            { card: "BT2-068", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.perm("cost").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[0]!.battleArea.some((p) => p.permanentId === costId) && !s.perm("host").isSuspended,
    );

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-068")).toBe(true);
  });
});
