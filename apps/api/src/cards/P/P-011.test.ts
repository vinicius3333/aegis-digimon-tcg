import { describe, expect, it } from "vitest";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-011.js";
import { returnOfferedTrashCardsWatchingViews } from "./qaRulings3.testSupport.js";

describe("P-011 Veedramon Zero", () => {
  it("may trash exactly the top 3 cards with a blue Tamer to gain +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-011", as: "attacker" },
            { card: "BT1-086", as: "tamer" },
          ],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
            { card: "BT1-009", as: "third" },
            { card: "BT1-009", as: "remaining" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("attacker").baseDP;
    const trashed = [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3 && s.perm("attacker").currentDP === baseDP + 2000);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(trashed));
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("remaining").instanceId);
  });

  it("cannot pay the mill cost with fewer than 3 cards in deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011", as: "attacker" }, { card: "BT1-086" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(baseDP);
  });

  it("returns 3 non-Digi-Egg cards from trash to deck bottom, then draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-043", as: "attacker", under: ["P-011"] }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          trash: [
            { card: "BT1-009", as: "digimon" },
            { card: "BT1-086", as: "tamer" },
            { card: "BT1-094", as: "option" },
            { card: "BT1-001", as: "egg" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;
    const eggId = s.inst("egg").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});

describe("P-011 Veedramon Zero — KB Q&A rulings", () => {
  function veedramonWithBlueTamer(deckSize: number, options: SetupEngineOptions) {
    return setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011", as: "attacker" }, { card: "BT1-086" }],
          deck: Array.from({ length: deckSize }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", suspended: true, dp: 1000 },
            { card: "BT1-009", as: "secondTarget", suspended: true, dp: 1000 },
          ],
        },
      },
      options,
    );
  }

  async function attack(s: ReturnType<typeof setupEngine>, attacker: string, target: string) {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "permanent", permanentId: s.perm(target).permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  }

  it("asks before trashing, and declining keeps the deck and DP unchanged (Q4116)", async () => {
    const s = veedramonWithBlueTamer(4, { autoDeclineOptional: true, autoSelectCards: true });
    const baseDP = s.perm("attacker").baseDP;

    await attack(s, "attacker", "firstTarget");

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(baseDP);
  });

  it("can't activate with 2 or fewer cards in the deck (Q4117)", async () => {
    const s = veedramonWithBlueTamer(2, { autoAcceptOptional: true, autoSelectCards: true });
    const baseDP = s.perm("attacker").baseDP;

    await attack(s, "attacker", "firstTarget");

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(baseDP);
  });

  it("trashes exactly 3 for +2000 per activation, never 6 for +4000 (Q4118)", async () => {
    const s = veedramonWithBlueTamer(6, { autoAcceptOptional: true, autoSelectCards: true });
    const baseDP = s.perm("attacker").baseDP;

    await attack(s, "attacker", "firstTarget");

    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(baseDP + 2000);
  });

  it("activates again on a second attack after an unsuspend, stacking another +2000 (Q4119)", async () => {
    const s = veedramonWithBlueTamer(6, { autoAcceptOptional: true, autoSelectCards: true });
    const baseDP = s.perm("attacker").baseDP;

    await attack(s, "attacker", "firstTarget");
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    await attack(s, "attacker", "secondTarget");

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(6);
    expect(s.perm("attacker").currentDP).toBe(baseDP + 4000);
  });

  function inheritedSetup(trash: string[]) {
    return setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-043", as: "attacker", under: ["P-011"] }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          trash: trash.map((card, index) => ({ card, as: `trash${index}` })),
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
  }

  it("can't use the inherited effect with only 2 non-Digi-Egg cards in trash (Q4120)", async () => {
    const s = inheritedSetup(["BT1-009", "BT1-086", "BT1-001"]);

    await attack(s, "attacker", "target");

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      ["trash0", "trash1", "trash2"].map((alias) => s.inst(alias).instanceId),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("lets the opponent see which trash cards it returns to the deck bottom (Q4121)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-043", as: "attacker", under: ["P-011"] }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          trash: ["BT1-009", "BT1-086", "BT1-094"].map((card, index) => ({ card, as: `trash${index}` })),
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoOrderCards: true },
    );
    const trashIds = ["trash0", "trash1", "trash2"].map((alias) => s.inst(alias).instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });

    const visibility = await returnOfferedTrashCardsWatchingViews(s);

    expect([...visibility.readersAtSelection.keys()].sort()).toEqual([...trashIds].sort());
    expect([...visibility.readersAtSelection.values()]).toEqual([
      [0, 1],
      [0, 1],
      [0, 1],
    ]);
    expect([...visibility.returnedInstanceIds].sort()).toEqual([...trashIds].sort());
    expect([...visibility.announcedCardIds].sort()).toEqual(["BT1-009", "BT1-086", "BT1-094"].sort());
  });

  it("always draws once the 3 cards are returned, with no separate choice to skip ＜Draw 1＞ (Q4122)", async () => {
    const s = inheritedSetup(["BT1-009", "BT1-086", "BT1-094"]);

    await attack(s, "attacker", "target");

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
