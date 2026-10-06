import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../EX13/EX13-054.js";
import "./BT5-044.js";

describe("BT5-044 Sakuyamon", () => {
  it("gives an opposing Digimon Security Attack -3 when it moves from breeding", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-044", as: "sakuya", under: ["BT5-042"] }] },
      1: { breeding: { card: "BT1-009", as: "mover" }, battleArea: [{ card: "BT1-010", as: "other" }] },
    });
    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack") === -3);
    expect(observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack")).toBe(-3);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);

    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack")).toBe(0);
  });

  it("does not watch a breeding move during your own turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-044", as: "sakuya" }] },
      1: { breeding: { card: "BT1-009", as: "mover" } },
    });
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenMovedFromBreeding", {
      subjectPermanentId: s.perm("mover").permanentId,
    });
    expect(observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack")).toBe(0);
  });

  it("gives opposing Security Digimon -3000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-044", as: "sakuya" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});

describe("BT5-044 Sakuyamon — KB Q&A rulings", () => {
  const DECK = ["BT1-009", "BT1-010", "BT1-009", "BT1-010", "BT1-009", "BT1-010"];

  function attackWithSakuyamon(security: { card: string; as: string }) {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-044", as: "sakuya" }], deck: [...DECK], security: ["BT1-010"] },
        1: { security: [security], deck: [...DECK] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("gives Security Attack -3 to a Digimon the opponent moves out of breeding during the breeding phase (Q1328)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-044", as: "sakuya" }], deck: [...DECK], security: ["BT1-010"] },
      1: {
        breeding: { card: "BT1-009", as: "mover" },
        battleArea: [{ card: "BT1-010", as: "bystander" }],
        deck: [...DECK],
        security: ["BT1-010"],
      },
    });
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);

    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack") === -3);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("mover").permanentId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack")).toBe(-3);
    expect(observe(s.engine).keywordAmount(s.perm("bystander"), "SecurityAttack")).toBe(0);
  });

  it("still battles a Security Digimon reduced to 0 DP instead of deleting it on the spot (Q1329)", async () => {
    const s = attackWithSakuyamon({ card: "BT1-009", as: "securityDigimon" });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", revealedCardId: "BT1-009", securityCardDP: 0 }),
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "securityChecked",
        revealedCardId: "BT1-009",
        resolution: "battle",
        battle: expect.objectContaining({ securityCardDP: 0, securityDigimonDeleted: true, attackerDeleted: false }),
      }),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("securityDigimon").instanceId,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("sakuya").permanentId)).toBe(true);
  });

  it("still activates the [Security] effect of a Security Digimon reduced to 0 DP (Q1330)", async () => {
    const s = attackWithSakuyamon({ card: "EX13-054", as: "nanimon" });
    const nanimonId = s.inst("nanimon").instanceId;
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === nanimonId));

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", revealedCardId: "EX13-054", securityCardDP: 0 }),
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "effectTriggered",
        sourceCardId: "EX13-054",
        timing: "whenSecurityBattleEnded",
        printedTiming: "SecuritySkill",
      }),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === nanimonId)).toBe(true);
  });

  it("does not reduce the DP of a Security Digimon once its [Security] effect plays it (Q1331)", async () => {
    const s = attackWithSakuyamon({ card: "EX13-054", as: "nanimon" });
    const nanimonId = s.inst("nanimon").instanceId;
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === nanimonId));
    await settle(() => !observe(s.engine).isAttacking());
    await s.engine.recomputeContinuousEffects();

    const played = s.state.players[1]!.battleArea.find((p) => p.topCard?.instanceId === nanimonId);
    expect(s.state.turnSeat).toBe(0);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(played?.currentDP).toBe(3000);
  });
});
