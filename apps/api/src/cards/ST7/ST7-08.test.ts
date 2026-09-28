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
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-08"] }] },
        1: {
          battleArea: [{ card: "ST7-02", as: "first" }],
          security: ["ST7-01"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("onDeletionOf")).not.toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
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

describe("ST7-08 WarGrowlmon — KB Q&A rulings", () => {
  async function piercingAttack(under: string[]) {
    const securityAttackAtEachReveal: number[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-026", as: "piercer", under }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      {
        autoSelectCards: true,
        onEvent: (event) => {
          if (event.kind === "securityRevealed")
            securityAttackAtEachReveal.push(observe(s.engine).keywordAmount(s.perm("piercer"), "SecurityAttack"));
        },
      },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("piercer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("piercer").permanentId]);
    return { securityLeft: s.state.players[1]!.security.length, securityAttackAtEachReveal };
  }

  it("grants <Security Attack +1> to the <Piercing> checks after its host deletes the Digimon it attacked (Q688)", async () => {
    expect(await piercingAttack(["ST7-08"])).toEqual({ securityLeft: 1, securityAttackAtEachReveal: [1, 1] });
    expect(await piercingAttack(["BT1-009"])).toEqual({ securityLeft: 2, securityAttackAtEachReveal: [0] });
  });
});
