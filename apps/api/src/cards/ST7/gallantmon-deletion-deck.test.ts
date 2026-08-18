import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-01.js";
import "./ST7-03.js";
import "./ST7-05.js";
import "./ST7-08.js";
import "./ST7-09.js";

describe("ST7 Gallantmon deletion deck gauntlet", () => {
  it("converts one when-attacking deletion into DP, draw, memory, and three checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST7-09",
              as: "gallantmon",
              under: ["ST7-01", "ST7-03", "ST7-05", "ST7-08"],
            },
          ],
          deck: [{ card: "ST7-02", as: "drawnByGuilmon" }],
        },
        1: {
          battleArea: [{ card: "ST7-04", as: "deletionTarget" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const gallantmon = s.perm("gallantmon");

    expect(observe(s.engine).keywordAmount(gallantmon, "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: gallantmon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 1 &&
        s.state.memory === 1,
      4000,
    );

    expect(gallantmon.currentDP).toBe(getCardDefinition("ST7-09")!.dp + 2000);
    expect(observe(s.engine).keywordAmount(gallantmon, "SecurityAttack")).toBe(2);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("drawnByGuilmon").instanceId }),
    );
    expect(s.state.players[1]!.trash).toContainEqual(expect.objectContaining({ cardId: "ST7-04" }));
    expect(
      s.events.filter((event) => event.kind === "securityChecked"),
      "base check + Gallantmon +1 + WarGrowlmon +1",
    ).toHaveLength(3);
  });
});
