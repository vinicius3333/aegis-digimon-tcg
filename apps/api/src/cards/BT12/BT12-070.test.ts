import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST4/ST4-08.js";
import "./BT12-070.js";

describe("BT12-070 WarGreymon", () => {
  it("digivolves for 3 from a level-5 MetalGreymon and rejects a name near-match", async () => {
    expect(digivolutionRequirementsFor("BT12-070")).toContainEqual({
      level: 5,
      names: ["MetalGreymon"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT12-068", as: "metal" }],
        hand: [{ card: "BT12-070", as: "war" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("metal").permanentId,
        instanceId: legal.inst("war").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("metal").topCard.cardId === "BT12-070");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("metal").stack.map(({ cardId }) => cardId)).toEqual(["BT12-068"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "weregarurumon" }], hand: [{ card: "BT12-070", as: "war" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("weregarurumon").permanentId,
        instanceId: illegal.inst("war").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("has Raid and gains +3000 DP and Reboot when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-070", as: "war" }] } });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("war"));
    expect(observe(s.engine).hasKeyword(s.perm("war"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("war"), "Reboot")).toBe(true);
    expect(s.perm("war").currentDP).toBe(s.perm("war").baseDP + 3000);
  });

  it("unsuspends once when an attack target is switched", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-070", as: "war", suspended: true }] } });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("war").permanentId,
    });
    expect(s.perm("war").isSuspended).toBe(false);
  });

  it("does not unsuspend again from a second target switch in the same turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-070", as: "war", suspended: true }] } });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("war").permanentId,
    });
    s.perm("war").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("war").permanentId,
    });
    expect(s.perm("war").isSuspended).toBe(true);
  });

  it.each(["mine", "opponent"])("unsuspends when the switched attack belongs to %s", async (owner) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-070", as: "war", suspended: true },
          { card: "BT1-009", as: "mine" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm(owner).permanentId,
    });
    expect(s.perm("war").isSuspended).toBe(false);
  });
});

describe("BT12-070 WarGreymon — KB Q&A rulings", () => {
  it("unsuspends when the opponent blocks its attack, because blocking switches the target (Q2209)", async () => {
    const blocked = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-070", as: "war" }] },
        1: { battleArea: [{ card: "ST4-08", as: "blocker" }], security: ["ST4-03"] },
      },
      { declinePrompts: ["Raid"] },
    );
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: blocked.perm("war").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => blocked.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(blocked.perm("war").isSuspended).toBe(true);
    expect(
      blocked.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocked.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => blocked.events.some(({ kind }) => kind === "combatResolved"));
    expect(blocked.state.players[1]!.battleArea).toHaveLength(0);
    expect(blocked.perm("war").isSuspended).toBe(false);

    const unblocked = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-070", as: "war" }] },
        1: { battleArea: [{ card: "ST4-08", as: "blocker" }], security: ["BT1-009"] },
      },
      { declinePrompts: ["Raid"] },
    );
    await unblocked.ready();
    expect(
      unblocked.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: unblocked.perm("war").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => unblocked.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(unblocked.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => unblocked.state.players[1]!.security.length === 0);
    await settle();
    expect(unblocked.perm("war").isSuspended).toBe(true);
  });

  it("unsuspends when an attack by my other Digimon or by an opponent's Digimon is blocked (Q2210)", async () => {
    const mine = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-070", as: "war", suspended: true },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "ST4-08", as: "blocker" }], security: ["ST4-03"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await mine.ready();
    expect(
      mine.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: mine.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => mine.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(mine.perm("war").isSuspended).toBe(true);
    expect(
      mine.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: mine.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => mine.events.some(({ kind }) => kind === "combatResolved"));
    expect(mine.perm("war").isSuspended).toBe(false);

    const opponent = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-070", as: "war", suspended: true },
            { card: "ST4-08", as: "blocker" },
          ],
          security: ["ST4-03"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    opponent.state.turnSeat = 1;
    await opponent.ready();
    expect(
      opponent.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opponent.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(opponent.perm("war").isSuspended).toBe(true);
    expect(
      opponent.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: opponent.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.events.some(({ kind }) => kind === "combatResolved"));
    expect(opponent.state.players[1]!.battleArea).toHaveLength(0);
    expect(opponent.perm("war").isSuspended).toBe(false);
  });
});
