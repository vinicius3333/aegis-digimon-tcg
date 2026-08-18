import { describe, expect, it } from "vitest";
import { EffectDuration, type PlayerState, type Seat } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "../testkit/index.js";
import { advance } from "../testkit/advance.js";
import "../../cards/index.js";

/**
 * Every `Restriction` a card can record must have a consumer that honors it.
 *
 * Five kinds — `beDeleted`, `beReturned`, `beTrashed`, `dpImmune`, `attackTargetChange` —
 * shipped for a long time with none: `restrict()` accepted them, the ledger stored them, and
 * no engine path ever read them, so 41 card modules carried protection that silently did
 * nothing while typechecking and passing every test. These cases pin the consumers.
 *
 * The scoped variant matters as much as the unscoped one. Most printed protection reads
 * "…by your opponent's effects", so a prohibition that blocked the controller's own effects
 * too would be a new bug in place of the old one.
 */

const player = (s: EngineSetup, seat: Seat): PlayerState => s.state.players[seat] as PlayerState;

/** A board where seat 0 is the turn player, so seat 1's permanent is the opponent's. */
function twoDigimon(): EngineSetup {
  return setupEngine({
    0: { battleArea: [{ card: "BT1-019", as: "mine" }] },
    1: { battleArea: [{ card: "BT1-019", as: "theirs" }] },
  });
}

describe("beDeleted", () => {
  it("stops an effect deletion", async () => {
    const s = twoDigimon();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("theirs").permanentId,
      "beDeleted",
      EffectDuration.Permanent,
    );

    const removed = await advance(s.engine).verb.deletePermanent([s.perm("theirs").permanentId]);

    expect(removed).toBe(0);
    expect(player(s, 1).battleArea).toHaveLength(1);
  });

  it("stops a rule deletion too, so a 0 DP protection survives the state-based sweep", async () => {
    const s = twoDigimon();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("theirs").permanentId,
      "beDeleted",
      EffectDuration.Permanent,
    );

    const removed = await advance(s.engine).verb.deletePermanent(
      [s.perm("theirs").permanentId],
      "byRule",
    );

    expect(removed).toBe(0);
  });

  it("deletes normally when nothing is restricted", async () => {
    const s = twoDigimon();

    const removed = await advance(s.engine).verb.deletePermanent([s.perm("theirs").permanentId]);

    expect(removed).toBe(1);
    expect(player(s, 1).battleArea).toHaveLength(0);
  });

  describe("scoped to the opponent's effects", () => {
    it("stops the opponent's effect", async () => {
      const s = twoDigimon();
      advance(s.engine).ledgers.continuous.addRestriction(
        s.perm("theirs").permanentId,
        "beDeleted",
        EffectDuration.Permanent,
        { byOpponentEffectsOnly: true },
      );

      const removed = await advance(s.engine).verb.deletePermanent([s.perm("theirs").permanentId]);

      expect(removed).toBe(0);
    });

    it("leaves the controller's own effect free to delete it", async () => {
      const s = twoDigimon();
      advance(s.engine).ledgers.continuous.addRestriction(
        s.perm("mine").permanentId,
        "beDeleted",
        EffectDuration.Permanent,
        { byOpponentEffectsOnly: true },
      );

      const removed = await advance(s.engine).verb.deletePermanent([s.perm("mine").permanentId]);

      expect(removed).toBe(1);
    });

    it("does not apply to a rule deletion, which has no controlling effect", async () => {
      const s = twoDigimon();
      advance(s.engine).ledgers.continuous.addRestriction(
        s.perm("theirs").permanentId,
        "beDeleted",
        EffectDuration.Permanent,
        { byOpponentEffectsOnly: true },
      );

      const removed = await advance(s.engine).verb.deletePermanent(
        [s.perm("theirs").permanentId],
        "byRule",
      );

      expect(removed).toBe(1);
    });
  });
});

describe("beReturned", () => {
  it("stops a return to hand", async () => {
    const s = twoDigimon();
    const target = s.perm("theirs");
    advance(s.engine).ledgers.continuous.addRestriction(
      target.permanentId,
      "beReturned",
      EffectDuration.Permanent,
    );

    await advance(s.engine).verb.returnToHand([target.topCard!.instanceId]);

    expect(player(s, 1).battleArea).toHaveLength(1);
    expect(player(s, 1).hand).toHaveLength(0);
  });

  it("stops a return to deck through the same gate", async () => {
    const s = twoDigimon();
    const target = s.perm("theirs");
    const deckBefore = player(s, 1).deck.length;
    advance(s.engine).ledgers.continuous.addRestriction(
      target.permanentId,
      "beReturned",
      EffectDuration.Permanent,
    );

    await advance(s.engine).verb.returnToDeck([target.topCard!.instanceId]);

    expect(player(s, 1).battleArea).toHaveLength(1);
    expect(player(s, 1).deck).toHaveLength(deckBefore);
  });

  it("returns normally when nothing is restricted", async () => {
    const s = twoDigimon();

    await advance(s.engine).verb.returnToHand([s.perm("theirs").topCard!.instanceId]);

    expect(player(s, 1).battleArea).toHaveLength(0);
    expect(player(s, 1).hand).toHaveLength(1);
  });

  it("leaves the controller's own effect free when scoped to the opponent's", async () => {
    const s = twoDigimon();
    const target = s.perm("mine");
    advance(s.engine).ledgers.continuous.addRestriction(
      target.permanentId,
      "beReturned",
      EffectDuration.Permanent,
      { byOpponentEffectsOnly: true },
    );

    await advance(s.engine).verb.returnToHand([target.topCard!.instanceId]);

    expect(player(s, 0).battleArea).toHaveLength(0);
  });
});

describe("beTrashed", () => {
  it("protects one exact stack card while the same effect trashes its neighbor", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "host", under: ["ST1-03", "BT9-109"] }] },
    });
    const [trashable, protectedCard] = s.perm("host").stack;
    advance(s.engine).ledgers.continuous.addStackCardTrashLock(
      protectedCard!.instanceId,
      0,
      EffectDuration.Permanent,
    );

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [trashable!.instanceId, protectedCard!.instanceId],
      0,
    );

    expect(player(s, 0).trash.map((card) => card.instanceId)).toContain(trashable!.instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([protectedCard!.instanceId]);
  });

  it("stops a digivolution-stack card of the protected permanent from being trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "host", under: ["ST1-03"] }] },
    });
    const stackCard = s.perm("host").stack[0]!;
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("host").permanentId,
      "beTrashed",
      EffectDuration.Permanent,
    );

    await advance(s.engine).verb.trash([stackCard.instanceId]);

    expect(s.perm("host").stack).toHaveLength(1);
    expect(player(s, 0).trash).toHaveLength(0);
  });

  it("trashes normally when nothing is restricted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "host", under: ["ST1-03"] }] },
    });
    const stackCard = s.perm("host").stack[0]!;

    await advance(s.engine).verb.trash([stackCard.instanceId]);

    expect(s.perm("host").stack).toHaveLength(0);
    expect(player(s, 0).trash).toHaveLength(1);
  });

  it("never gates a loose card, which belongs to no permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "host" }], hand: ["BT2-034"] } });
    const loose = player(s, 0).hand[0]!;
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("host").permanentId,
      "beTrashed",
      EffectDuration.Permanent,
    );

    await advance(s.engine).verb.trash([loose.instanceId]);

    expect(player(s, 0).hand).toHaveLength(0);
    expect(player(s, 0).trash).toHaveLength(1);
  });
});

describe("dpImmune", () => {
  it("blocks a DP reduction", async () => {
    const s = twoDigimon();
    const before = s.perm("theirs").currentDP;
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("theirs").permanentId,
      "dpImmune",
      EffectDuration.Permanent,
    );

    await advance(s.engine).verb.modifyDP(
      s.perm("theirs").permanentId,
      -3000,
      EffectDuration.UntilOpponentTurnEnd,
    );

    expect(s.perm("theirs").currentDP).toBe(before);
  });

  it("still lets a DP buff land, because the printed wording only bars reduction", async () => {
    const s = twoDigimon();
    const before = s.perm("theirs").currentDP;
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("theirs").permanentId,
      "dpImmune",
      EffectDuration.Permanent,
    );

    await advance(s.engine).verb.modifyDP(
      s.perm("theirs").permanentId,
      3000,
      EffectDuration.UntilOpponentTurnEnd,
    );

    expect(s.perm("theirs").currentDP).toBe(before + 3000);
  });

  it("reduces normally when nothing is restricted", async () => {
    const s = twoDigimon();
    const before = s.perm("theirs").currentDP;

    await advance(s.engine).verb.modifyDP(
      s.perm("theirs").permanentId,
      -3000,
      EffectDuration.UntilOpponentTurnEnd,
    );

    expect(s.perm("theirs").currentDP).toBe(before - 3000);
  });
});

// `attackTargetChange` is gated in combat legality (a block is a target switch, §12-1-1) and
// in `CombatController.redirectTarget`; its cases live in `combat/legality.test.ts` alongside
// the other legality readers.
