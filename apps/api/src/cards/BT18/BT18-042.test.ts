import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-042.js";

describe("BT18-042 MagnaGarurumon", () => {
  it("places an exact level 5 stack card into security and deletes the matching opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "host" }],
          hand: [{ card: "BT18-042", as: "magna" }],
          deck: ["BT1-009"],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-060"));

    expect(s.perm("host").topCard?.cardId).toBe("BT18-042");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-060")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(false);
  });
});
