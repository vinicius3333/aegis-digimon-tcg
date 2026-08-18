import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-08.js";
import "./ST7-09.js";

describe("ST7-08 WarGrowlmon", () => {
  it("deletes an opposing Digimon with 3000 DP or less when attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST7-08", as: "war" }] }, 1: { battleArea: ["ST7-02"], security: ["ST7-01"] } },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("war").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
  });

  it("gives its host Security Attack +1 once when an opposing Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-08"] }] },
        1: { battleArea: ["ST7-02"], security: ["ST7-01"] },
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
    await settle(() => observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1);
  });

  it("does not grant Security Attack again on a second deletion that turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-08"] }] },
      1: {
        battleArea: [{ card: "ST7-02", as: "first" }],
        security: ["ST7-01"],
      },
    }, { autoSelectCards: true });
    await s.ready();
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("onDeletionOf")).not.toHaveLength(0);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 2,
    );
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(2);
    const second = s.putOnBoard(1, "ST7-02");
    await advance(s.engine).verb.deletePermanent([second.permanentId]);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(2);
  });
});
