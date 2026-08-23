import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-020.js";
import "../BT2/BT2-107.js";
import "../BT3/BT3-097.js";
import "../ST7/ST7-09.js";
import "./EX2-073.js";

describe("Gallantmon SEC security-pressure deck", () => {
  it("trashes security before the check and suppresses only the remaining Option security effect", async () => {
    const trash = Array.from({ length: 20 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085" }, { card: "BT2-020", as: "gallantmon", dp: 20_000 }],
          hand: [{ card: "BT3-097", as: "plan" }],
        },
        1: {
          trash,
          security: ["BT1-010", "BT1-011", "BT2-107"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("plan").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-097"));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(9);
  });

  it("turns two highest-DP deletions into the 10-trash threshold for Crimson Mode", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-09", as: "gallantmon" }],
          hand: [{ card: "EX2-073", as: "crimson" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "highestA", dp: 10_000 },
            { card: "BT2-047", as: "highestB", dp: 10_000 },
            { card: "BT1-010", dp: 4000 },
          ],
          trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008"],
          security: ["BT1-009", "BT1-011", "BT1-012"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gallantmon").permanentId,
        instanceId: s.inst("crimson").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 10);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
