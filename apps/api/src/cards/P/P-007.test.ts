import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-109.js";
import "../ST6/ST6-03.js";
import "./P-007.js";

describe("P-007 Garurumon", () => {
  it("draws when its Garurumon-family host attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-008", as: "family", under: ["P-007"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("family").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(drawnId);
  });

  it("does not draw under an unrelated host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "unrelated", under: ["P-007"] }],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("unrelated").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("attributes the real Garurumon + X Antibody attack triggers without inventing P-008", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT5-024",
              as: "garurumon",
              under: ["BT9-109", "BT5-002", "ST6-03", "BT9-020", "P-007"],
            },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { security: 5 },
      },
      { autoOrderTriggers: false },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("garurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderTriggers"));

    const ordering = s.decisions.find(({ req }) => req.kind === "orderTriggers")?.req;
    expect(ordering?.options?.triggerCardIds).toEqual(["ST6-03", "P-007"]);
    expect(ordering?.options?.triggerKeys).toEqual([
      expect.stringContaining("::ST6-03/"),
      expect.stringContaining("::P-007/"),
    ]);
    expect(ordering?.options?.triggerCardIds).not.toContain("P-008");
    expect(ordering?.options?.triggerKeys?.join(" ")).not.toContain("P-008");
  });
});
