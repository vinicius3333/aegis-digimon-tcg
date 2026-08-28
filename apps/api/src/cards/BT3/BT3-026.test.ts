import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-026.js";

describe("BT3-026 MagnaAngemon", () => {
  it("trashes the bottom digivolution card of an opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-029", as: "host", under: ["BT3-026"] }] },
        1: {
          battleArea: [
            {
              card: "BT1-019",
              as: "target",
              under: [
                { card: "BT1-010", as: "bottomSource" },
                { card: "BT1-011", as: "topSource" },
              ],
            },
          ],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    const bottomSourceId = s.inst("bottomSource").instanceId;
    const topSourceId = s.inst("topSource").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomSourceId), 5000);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === bottomSourceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === topSourceId)).toBe(false);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.instanceId).toBe(topSourceId);
  });

  it("does not trash anything when the opposing Digimon has no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-029", as: "host", under: ["BT3-026"] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(false);
  });
});
