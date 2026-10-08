import { Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type SeatSpec } from "./testkit/harness.js";

describe("EX12-016 public grant controls (Discord 1557600224011096104)", () => {
  it.each([
    { label: "source seat 1 grants to seat 0 even with no deletion target", seat: 1, card: "BT1-021", attacks: true },
    {
      label: "grant persists after DeathXmon deletes its source before recipient Main",
      seat: 0,
      card: "BT1-021",
      deathX: true,
      attacks: true,
    },
    { label: "recipient's printed attack prohibition wins", seat: 0, card: "BT2-058", deletion: true, attacks: false },
    {
      label: "player prohibition and no suspended defenders leave no legal attack",
      seat: 0,
      card: "ST14-04",
      deletion: true,
      attacks: false,
    },
    {
      label: "live immunity suppresses the granted trigger (Q6740)",
      seat: 0,
      card: "ST18-12",
      attacks: false,
      immune: true,
    },
    {
      label: "breeding Digimon cannot receive or activate the grant",
      seat: 0,
      card: "BT1-021",
      breedingOnly: true,
      attacks: false,
    },
    {
      label: "deleting the only battle Digimon leaves nobody to grant",
      seat: 0,
      card: "BT1-011",
      deleteAll: true,
      attacks: false,
    },
  ] as const)("$label", async (testCase) => {
    const sourceSeat = testCase.seat as Seat;
    const recipientSeat = (1 - sourceSeat) as Seat;
    const flags = testCase as typeof testCase & {
      deathX?: boolean;
      deletion?: boolean;
      immune?: boolean;
      breedingOnly?: boolean;
      deleteAll?: boolean;
    };
    const source: SeatSpec = {
      hand: [{ card: "EX12-016", as: "source" }],
      deck: Array(10).fill("BT1-009"),
      security: Array(5).fill("BT1-011"),
      breeding: "BT1-009",
    };
    const recipient: SeatSpec = {
      battleArea: [
        ...(flags.deletion ? [{ card: "BT1-011", as: "deleted" }] : []),
        ...(flags.breedingOnly ? [] : [{ card: testCase.card, as: "recipient", suspended: flags.immune === true }]),
        ...(flags.deathX ? [{ card: "BT9-112", as: "deathX" }] : []),
      ],
      breeding: flags.breedingOnly ? { card: testCase.card, as: "recipient" } : "BT1-009",
      deck: Array(10).fill("BT1-009"),
      security: Array(5).fill("BT1-011"),
    };
    const s = setupEngine(
      { [sourceSeat]: source, [recipientSeat]: recipient },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = sourceSeat;
    s.state.memory = 10;
    s.state.isFirstPlayersFirstTurn = false;
    const recipientPermanent = s.perm("recipient");
    const recipientId = recipientPermanent.permanentId;
    const hasGrant = !flags.breedingOnly && !flags.deleteAll;
    const sourceId = s.inst("source").instanceId;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === sourceSeat);
      expect(s.engine.applyIntent(sourceSeat, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(sourceSeat);
      expect(s.engine.applyIntent(sourceSeat, { type: "playCard", instanceId: sourceId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[sourceSeat]!.battleArea.some((p) => p.topCard.instanceId === sourceId),
      );
      expect(recipientPermanent.grantedEffectTexts.join(" ").includes("[Start of Your Main Phase]")).toBe(hasGrant);
      expect(recipientPermanent.attacksAtStartOfMainPhase).toBe(hasGrant);
      expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
      expect(s.engine.applyIntent(sourceSeat, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === recipientSeat);
      expect(s.state.players[sourceSeat]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        flags.deathX ? [] : [sourceId],
      );
      expect(s.state.players[sourceSeat]!.trash.some((card) => card.instanceId === sourceId)).toBe(
        flags.deathX === true,
      );
      expect(recipientPermanent.attacksAtStartOfMainPhase).toBe(hasGrant && !flags.immune);
      expect(s.engine.applyIntent(recipientSeat, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(recipientSeat);
      expect(recipientPermanent.attacksAtStartOfMainPhase).toBe(hasGrant && !flags.immune);
      const attacks = s.events.filter((e) => e.kind === "attackDeclared");
      const expectedAttack = expect.objectContaining({
        seat: recipientSeat,
        attackerPermanentId: recipientId,
        target: { kind: "player" },
      });
      expect(attacks).toEqual(testCase.attacks ? [expectedAttack] : []);
      expect(s.state.players[recipientSeat]!.battleArea.some((p) => p.permanentId === recipientId)).toBe(
        !flags.breedingOnly && !flags.deleteAll,
      );
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });
});
