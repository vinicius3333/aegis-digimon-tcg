import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-011.js";

describe("BT6-011 BaoHuckmon", () => {
  it("deletes a 5000 DP Digimon when attacking while you have Sistermon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-015", under: ["BT6-011"], as: "host" }, "BT6-082", "BT6-082"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 5000, as: "firstTarget" },
            { card: "BT1-010", dp: 5000, as: "secondTarget" },
          ],
          security: ["BT1-010"],
        },
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
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});

describe("BT6-011 BaoHuckmon — KB Q&A rulings", () => {
  it("deletes only 1 Digimon even with 2 [Sistermon] Digimon in play (Q1406)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-015", under: ["BT6-011"], as: "host" }, "BT6-082", "BT6-082"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 5000, as: "firstTarget" },
            { card: "BT1-010", dp: 5000, as: "secondTarget" },
          ],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length < 2);
    await advance(s.engine).finishAttack();
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-010")).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
