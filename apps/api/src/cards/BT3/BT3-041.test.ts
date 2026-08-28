import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-041.js";

describe("BT3-041 Cherubimon", () => {
  it("places a yellow Digimon from trash face down on top of security when attacking at 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-041", as: "cherubimon" }],
          security: ["BT1-011", "BT1-012", "BT1-013"],
          trash: [
            { card: "BT3-033", as: "salmon" },
            { card: "BT1-010", as: "wrongColor" },
          ],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    const recoveredId = s.inst("salmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cherubimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId), 5000);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === recoveredId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongColor").instanceId)).toBe(true);
    expect(s.state.players[0]!.security[0]).toMatchObject({
      instanceId: recoveredId,
      faceUp: false,
    });
    expect(s.events).toContainEqual({
      kind: "cardRevealed",
      seat: 0,
      cardId: "BT3-033",
      sourceCardId: "BT3-041",
    });
  });

  it("does not recover from trash when you have more than 3 security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-041", as: "cherubimon" }],
          security: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          trash: [{ card: "BT3-033", as: "salmon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    const recoveredId = s.inst("salmon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cherubimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === recoveredId)).toBe(true);
  });
});
