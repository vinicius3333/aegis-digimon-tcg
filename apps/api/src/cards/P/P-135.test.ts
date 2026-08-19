import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("P-135 ShoeShoemon", () => {
  it("digivolves legally and makes one opponent unable to attack Digimon but still able to attack a player", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-134", as: "base" },
            { card: "BT1-009", as: "defender", suspended: true },
          ],
          hand: [{ card: "P-135", as: "shoeshoemon" }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-020", as: "restrictedAttacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const restrictedId = s.perm("restrictedAttacker").permanentId;
    preferred.push(restrictedId);
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("shoeshoemon").instanceId,
    })).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(restrictedId, "cantAttackDigimon") &&
        observe(s.engine).keywordAmount(restrictedId, "SecurityAttack") === -1,
    );

    expect(s.perm("base").topCard.cardId).toBe("P-135");
    expect(observe(s.engine).keywordAmount(restrictedId, "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: restrictedId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    })).toEqual({ ok: false, reason: "illegal-target" });

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: restrictedId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("gains Jamming on its owner's turn only while Arisa Kinosaki is present", async () => {
    const withArisa = setupEngine({
      0: { battleArea: [{ card: "P-135", as: "shoeshoemon" }, { card: "P-136", as: "arisa" }] },
    });
    await withArisa.ready();
    expect(observe(withArisa.engine).hasKeyword(withArisa.perm("shoeshoemon"), "Jamming")).toBe(true);

    withArisa.state.turnSeat = 1;
    await advance(withArisa.engine).recompute();
    expect(observe(withArisa.engine).hasKeyword(withArisa.perm("shoeshoemon"), "Jamming")).toBe(false);

    const withoutArisa = setupEngine({ 0: { battleArea: [{ card: "P-135", as: "shoeshoemon" }] } });
    await withoutArisa.ready();
    expect(observe(withoutArisa.engine).hasKeyword(withoutArisa.perm("shoeshoemon"), "Jamming")).toBe(false);
  });

  it("keeps both debuffs through its owner's turn and expires them at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-135", as: "shoeshoemon" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-020", as: "target" }], deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoeshoemon"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "cantAttackDigimon")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantAttackDigimon")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantAttackDigimon")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });

  it("applies the inherited -2000 DP attack effect only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-020", as: "host", under: ["P-135"] }] },
        1: { battleArea: [{ card: "BT1-020", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(4000);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(4000);
    assertNoLoudGap(s);
  });
});
