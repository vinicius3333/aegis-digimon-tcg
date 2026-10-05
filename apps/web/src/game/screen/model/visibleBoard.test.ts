import { CardInstance, GameState, Permanent, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { visibleBoard } from "./visibleBoard";
import { snapshotGameState } from "../../../net/presentedState";

function card(instanceId: string, cardId: string) {
  const value = new CardInstance();
  value.instanceId = instanceId;
  value.cardId = cardId;
  return value;
}

function permanent(permanentId: string, cardId = "ST20-14") {
  const value = new Permanent();
  value.permanentId = permanentId;
  value.topCard = card(`${permanentId}-card`, cardId);
  value.stack.push(value.topCard);
  value.currentDP = 5000;
  return value;
}

function board(version: number, field: Permanent[] = []) {
  const value = new GameState();
  value.stateVersion = version;
  const you = new PlayerState();
  const opponent = new PlayerState();
  opponent.seat = 1;
  opponent.battleArea.push(...field);
  value.players.push(you, opponent);
  return value;
}

function cues(): Parameters<typeof visibleBoard>[0]["cues"] {
  return {
    heldPhaseState: undefined,
    heldBlowState: undefined,
    heldSecurityEffectState: undefined,
    heldDrawState: undefined,
    heldBreedingState: undefined,
    heldDeletions: new Map(),
    heldStackStrips: new Map(),
    heldTrashArrivals: new Map(),
    heldHandArrivals: new Map(),
    pendingPermanentIds: new Set(),
    heldSuspendedIds: new Set(),
    heldSecurityCounts: new Map(),
    securityDealCounts: new Map(),
    heldMemory: undefined,
    displayedTurn: undefined,
  };
}

describe("visibleBoard", () => {
  it("reports the held armor and source until its peel completes, then exposes the promoted top", () => {
    const armor = permanent("armor", "BT8-012");
    armor.stack.clear();
    armor.stack.push(card("base", "BT1-009"));
    const promoted = permanent("armor", "BT1-009");
    promoted.stack.clear();
    const live = board(15, [promoted]);
    const holds = cues();
    holds.heldStackStrips.set(1, {
      seat: 1,
      permanent: armor,
      index: 0,
      stateVersion: 15,
      returnedInstanceId: undefined,
    });
    const held = visibleBoard({ live, displayed: live, viewerSeat: 0, cues: holds })!;
    expect(held.players[1].battleArea[0]!.topCard.cardId).toBe("BT8-012");
    expect(held.players[1].battleArea[0]!.stack.map((value) => value.cardId)).toEqual(["BT1-009"]);
    holds.heldStackStrips.clear();
    const complete = visibleBoard({ live, displayed: live, viewerSeat: 0, cues: holds })!;
    expect(complete.players[1].battleArea[0]!.topCard.cardId).toBe("BT1-009");
    expect(complete.players[1].battleArea[0]!.stack).toEqual([]);
    expect(held.players[1].battleArea[0]!.topCard.cardId).toBe("BT8-012");
  });
  it("preserves hidden opponent hand identities omitted from a real plain seat-view snapshot", () => {
    const live = board(15);
    live.players[1]!.handCount = 5;
    const displayed = snapshotGameState(live);
    const opponent = displayed.players[1]!;
    // Colyseus's seat view withholds the collection; toJSON preserves the absence.
    delete (opponent as Partial<PlayerState>).hand;
    const sample = visibleBoard({ live, displayed, viewerSeat: 0, cues: cues() })!;
    expect(sample.players[1].hand).toEqual([]);
    expect(sample.players[1].handCount).toBe(5);
  });

  it("does not report a Security placement while the reveal or arrival still hides it", () => {
    // The ghost/Execute production chain reaches revision 15 before ST20-14's clause.
    // The raw snapshot already has Our Courage United; the actual field has two holds.
    const displayed = board(15, [permanent("courage")]);
    const reveal = board(14);
    const holds = cues();
    holds.heldSecurityEffectState = reveal;
    holds.pendingPermanentIds = new Set(["courage"]);
    const sample = () => visibleBoard({ live: displayed, displayed, viewerSeat: 0, cues: holds })!;

    expect(displayed.players[1]!.battleArea).toHaveLength(1);
    expect(sample().players[1].battleArea).toEqual([]);
    holds.heldSecurityEffectState = undefined;
    expect(sample().players[1].battleArea).toEqual([]);
    holds.pendingPermanentIds = new Set();
    expect(sample().players[1].battleArea.map((value) => value.permanentId)).toEqual(["courage"]);
  });

  it("does not import a future Security reveal's DP and rotation into an earlier narrated field", () => {
    // Opponent-chain coalesces later Security with several earlier accepted watchers.
    // Its revision-32 reveal must not replace the board still narrating revision 17.
    const earlier = board(17, [permanent("watcher", "EX8-011")]);
    const reveal = board(32, [permanent("watcher", "EX8-011")]);
    reveal.players[1]!.battleArea[0]!.currentDP = 8000;
    reveal.players[1]!.battleArea[0]!.isSuspended = true;
    const after = board(33, [permanent("watcher", "EX8-011")]);
    after.players[1]!.battleArea[0]!.currentDP = 10_000;
    const holds = cues();
    holds.heldSecurityEffectState = reveal;
    const sample = (displayed: GameState) =>
      visibleBoard({ live: after, displayed, viewerSeat: 0, cues: holds, presentationPacing: "sequential" })!;

    expect(sample(earlier).players[1].battleArea[0]).toMatchObject({ currentDP: 5000, isSuspended: false });
    // Once its own revision is reached, the reveal still holds the Security result.
    expect(sample(after).players[1].battleArea[0]).toMatchObject({ currentDP: 8000, isSuspended: true });
    holds.heldSecurityEffectState = undefined;
    expect(sample(after).players[1].battleArea[0]).toMatchObject({ currentDP: 10_000, isSuspended: false });
  });

  it.each(["phase", "blow", "draw"] as const)(
    "keeps a future %s hold behind its narrated revision, then applies it at its own horizon",
    (kind) => {
      const earlier = board(17, [permanent("standing")]);
      earlier.players[1]!.handCount = 1;
      earlier.players[1]!.deckCount = 30;
      const futureHold = board(32, [permanent("standing"), permanent("future-arrival")]);
      futureHold.players[1]!.battleArea[0]!.isSuspended = true;
      futureHold.players[1]!.handCount = 3;
      futureHold.players[1]!.deckCount = 28;
      const after = board(33, [permanent("standing")]);
      after.players[1]!.handCount = 4;
      after.players[1]!.deckCount = 27;
      const holds = cues();
      if (kind === "phase") holds.heldPhaseState = futureHold;
      if (kind === "blow") holds.heldBlowState = futureHold;
      if (kind === "draw") holds.heldDrawState = { seat: 1, state: futureHold };
      const sample = (displayed: GameState) =>
        visibleBoard({ live: after, displayed, viewerSeat: 0, cues: holds, presentationPacing: "sequential" })!
          .players[1];

      expect(sample(earlier).battleArea.map((value) => value.permanentId)).toEqual(["standing"]);
      expect(sample(earlier).battleArea[0]!.isSuspended).toBe(false);
      expect(sample(earlier)).toMatchObject({ handCount: 1, deckCount: 30 });
      expect(sample(after).battleArea[0]!.isSuspended).toBe(kind === "phase");
      expect(sample(after).battleArea.map((value) => value.permanentId)).toEqual(
        kind === "blow" ? ["standing", "future-arrival"] : ["standing"],
      );
      expect(sample(after)).toMatchObject({
        handCount: kind === "draw" ? 3 : 4,
        deckCount: kind === "draw" ? 28 : 27,
      });
    },
  );

  it("samples restored deletion membership and trash instead of the selected revision", () => {
    const deleted = permanent("deleted", "BT1-010");
    const displayed = board(25);
    displayed.players[1]!.trash.push(deleted.topCard!);
    const holds = cues();
    holds.heldDeletions = new Map([[1, { seat: 1, permanent: deleted, index: 0, trash: [] }]]);
    const sample = () => visibleBoard({ live: displayed, displayed, viewerSeat: 0, cues: holds })!;

    expect(sample().players[1].battleArea.map((value) => value.permanentId)).toEqual(["deleted"]);
    expect(sample().players[1].trash).toEqual([]);
    holds.heldDeletions = new Map();
    expect(sample().players[1].battleArea).toEqual([]);
    expect(sample().players[1].trash.map((value) => value.instanceId)).toEqual(["deleted-card"]);
  });

  it("keeps a recorded field frame stable after later mutable schema patches", () => {
    const displayed = board(1, [permanent("digimon")]);
    const holds = cues();
    holds.heldSuspendedIds = new Set(["digimon"]);
    const sample = visibleBoard({ live: displayed, displayed, viewerSeat: 0, cues: holds })!;
    const value = displayed.players[1]!.battleArea[0]!;
    value.topCard!.cardId = "BT1-011";
    value.currentDP = 8000;
    value.keywords.push("Rush");

    expect(sample.players[1].battleArea[0]).toMatchObject({
      topCard: { cardId: "ST20-14" },
      isSuspended: true,
      currentDP: 5000,
      keywords: [],
    });
    expect(sample.players[1].battleArea[0]!.stack[0]!.cardId).toBe("ST20-14");
  });

  it("samples seat-one hand, draw, breeding, shield and memory holds as the screen does", () => {
    const displayed = board(4);
    displayed.turnSeat = 1;
    displayed.turnCount = 3;
    displayed.memory = 2;
    displayed.players[1]!.hand.push(card("played", "ST20-14"), card("other", "BT1-010"));
    displayed.players[1]!.handCount = 2;
    displayed.players[0]!.handCount = 5;
    displayed.players[0]!.deckCount = 30;
    displayed.players[0]!.securityCount = 3;
    const earlier = board(3);
    earlier.players[0]!.handCount = 4;
    earlier.players[0]!.deckCount = 31;
    earlier.players[0]!.breeding = permanent("egg", "BT1-001");
    const holds = cues();
    holds.heldDrawState = { seat: 0, state: earlier };
    holds.heldBreedingState = { seat: 0, player: earlier.players[0]! };
    holds.heldSecurityCounts = new Map([[0, 4]]);
    holds.heldMemory = { key: 1, memory: -1, turnSeat: 0 };
    holds.displayedTurn = { seat: 0, count: 2 };
    const sample = visibleBoard({
      live: displayed,
      displayed,
      viewerSeat: 1,
      cues: holds,
      optimisticPlayedInstanceId: "played",
    })!;

    expect(sample.players[1].hand.map((value) => value.instanceId)).toEqual(["other"]);
    expect(sample.players[1].handCount).toBe(1);
    expect(sample.players[0]).toMatchObject({
      handCount: 4,
      deckCount: 31,
      securityCount: 4,
      breeding: { permanentId: "egg" },
    });
    expect(sample.memory).toEqual({ value: -1, turnSeat: 0 });
    expect(sample.turn).toEqual({ seat: 0, count: 2 });
  });
});
