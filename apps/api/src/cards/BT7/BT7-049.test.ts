import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-049.js";

describe("BT7-049 MameTyramon", () => {
  it("digivolves into a revealed green level 6 without paying its cost when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-049", as: "mame" }],
          deck: [{ card: "BT7-054", as: "ancient" }, "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mame").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mame").topCard?.instanceId === s.inst("ancient").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("mame").stack.some((card) => card.cardId === "BT7-049")).toBe(true);
  });

  it("digivolves only this Digimon when another friendly Digimon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-049", as: "mame" },
            { card: "BT1-010", as: "other" },
          ],
          deck: [{ card: "BT7-054", as: "ancient" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mame").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mame").topCard?.instanceId === s.inst("ancient").instanceId);

    expect(s.perm("mame").topCard?.instanceId).toBe(s.inst("ancient").instanceId);
    expect(s.perm("other").topCard?.cardId).toBe("BT1-010");
  });
});
