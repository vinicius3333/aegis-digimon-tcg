import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-018.js";
import "../BT12/BT12-092.js";

describe("BT13-018 ShineGreymon", () => {
  it("uses substring RizeGreymon evolution but exact Marcus Damon targets", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["RizeGreymon"], cost: 3, isAlternate: true },
    ]);
    expect(JSON.stringify(compiled)).not.toContain('"tokens":["Marcus Damon"],"match":"name"');
    expect(JSON.stringify(compiled)).toContain('"tokens":["Marcus Damon"],"match":"nameExact"');
    expect(compiled.effects[0]?.actions[1]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[0]?.actions[2]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[1]?.actions[1]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[1]?.actions[2]).toMatchObject({ target: { sameTarget: true } });
  });

  it("at Start of Main publicly makes Marcus a 3000 DP Blocker Digimon that can attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { security: [{ card: "BT1-010", as: "weakSecurity" }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("marcus").currentDP === 3000);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("weakSecurity").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("when digivolving from RizeGreymon for 3 grants the same Marcus effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT13-018", as: "shine" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rize").permanentId,
        instanceId: s.inst("shine").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").currentDP === 3000);
    await settle();
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
  });

  it("does not affect the near-name Marcus Damon & Agumon Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-018", as: "shine" },
          { card: "AD1-021", as: "nearMarcus" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("shine"));

    expect(s.perm("nearMarcus").currentDP).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("nearMarcus"), "Blocker")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("nearMarcus"), "digivolve")).toBe(false);
  });

  it("publicly suspending Marcus after Start of Main gives one opposing Digimon -6000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-092", as: "secondMarcus" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "target" }],
          security: [{ card: "BT1-010", as: "weakSecurity" }, "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const shineId = s.perm("shine").topCard.instanceId;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("marcus").currentDP === 3000);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.perm("shine").topCard.instanceId).toBe(shineId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(1000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(s.perm("target").currentDP).toBe(7000);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.perm("shine").topCard.instanceId).toBe(shineId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("supplemental event ignores a blue-only Tamer suspension", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-018", as: "shine" },
          { card: "BT13-097", as: "blueTamer" },
        ],
      },
      1: { battleArea: [{ card: "BT1-021", as: "target" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("blueTamer").permanentId,
    });

    expect(s.perm("target").currentDP).toBe(7000);
  });
});
