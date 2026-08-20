import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT25-093";

describe("BT25-093 Ignition Flare", () => {
  it("cannot be used without the printed color requirement or an effective TS permanent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "flare" }] } });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain(CARD_ID);
  });

  it("uses a runtime TS trait, observes failed mandatory deletion, trashes only a placed Option, then links to breeding", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-019", as: "breedingHost" },
          battleArea: [{ card: "BT1-051", as: "runtimeTs" }],
          hand: [{ card: CARD_ID, as: "flare" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 2000, as: "protectedLowest" },
            { card: "AD1-001", dp: 5000, as: "higher" },
            { card: "BT25-098", as: "placedOption" },
            { card: "BT26-014", as: "dualDigimonOption" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("placedOption").placedByEffect = true;
    s.perm("dualDigimonOption").placedByEffect = true;
    await s.ready();
    advance(s.engine).ledgers.continuous.addNameTraitGrant(
      s.perm("runtimeTs").permanentId,
      "trait",
      ["TS"],
      EffectDuration.UntilEachTurnEnd,
    );
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("protectedLowest").permanentId,
      "beDeleted",
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(s.engine).recompute();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("breedingHost").linked.some((card) => card.cardId === CARD_ID));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("protectedLowest").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("higher").permanentId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT25-098");
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT26-014")).toBe(true);
  });

  it("mandatorily deletes every tied lowest-DP Digimon and therefore does not trash a placed Option", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-019", as: "ts" }], hand: [{ card: CARD_ID, as: "flare" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "lowOne" },
            { card: "BT1-019", dp: 3000, as: "lowTwo" },
            { card: "AD1-001", dp: 5000, as: "high" },
            { card: "BT25-098", as: "placedOption" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.perm("placedOption").placedByEffect = true;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.filter((p) => p.topCard.cardId !== "BT25-098").length === 1);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-019"]),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT25-098")).toBe(true);
  });

  it("Security activates the same Main flow", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: CARD_ID, as: "securityFlare", faceUp: true }],
          battleArea: [{ card: "AD1-001", as: "host" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityFlare"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("linked When Attacking deletes at host DP, is a physical OPT, and ignores the over-DP boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-019", dp: 5000, linked: [{ card: CARD_ID, as: "linkedFlare" }], as: "host" }],
        },
        1: {
          security: ["BT1-085", "BT1-085"],
          battleArea: [
            { card: "BT1-009", dp: 5000, as: "equalOne" },
            { card: "BT1-019", dp: 5000, as: "equalTwo" },
            { card: "AD1-001", dp: 6000, as: "over" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("equalOne").permanentId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.filter((p) => p.currentDP === 5000)).toHaveLength(1);
    preferred.splice(0, preferred.length, s.perm("equalTwo").permanentId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[1]!.battleArea.filter((p) => p.currentDP === 5000)).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.currentDP === 6000)).toBe(true);
  });

  it("Q6439 treats the linked attack deletion as a Digimon effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-019", linked: [{ card: CARD_ID }], as: "host" }],
      },
      1: {
        security: ["BT1-085"],
        battleArea: [{ card: "BT1-009", dp: 3000, as: "protected" }],
      },
    });
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("protected").permanentId,
      "beAffected",
      EffectDuration.UntilOpponentTurnEnd,
      { fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true },
    );
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("protected").permanentId)).toBe(true);
  });
});
