import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-047.js";
import { returnOfferedTrashCardsWatchingViews } from "./qaRulings3.testSupport.js";

describe("P-047 AeroVeedramon Zero", () => {
  it("trashes up to 3 deck cards and gets +3000 DP for the turn with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-010", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-047", as: "source" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.deck.length === 0 && s.perm("base").currentDP === s.perm("base").baseDP + 3000,
    );

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP + 3000);
  });

  it("still trashes 3 cards but gets no DP bonus without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "base" }],
          hand: [{ card: "P-047", as: "source" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP);
  });

  it("inherited effect returns exactly 3 non-Digi-Egg cards and grants +2000 DP when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] }],
          trash: [
            { card: "BT1-009", as: "trash-a" },
            { card: "BT1-010", as: "trash-b" },
            { card: "BT1-011", as: "trash-c" },
            { card: "BT1-001", as: "egg" },
          ],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const returnedIds = [s.inst("trash-a"), s.inst("trash-b"), s.inst("trash-c")].map((card) => card.instanceId);
    const eggId = s.inst("egg").instanceId;
    const baseDp = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        returnedIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id)) &&
        s.perm("attacker").currentDP === baseDp + 2000,
    );
    await settle();

    expect(returnedIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id))).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === eggId)).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(baseDp + 2000);
  });

  it("cannot pay the inherited effect with fewer than 3 non-Digi-Egg cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] }],
          trash: ["BT1-009", "BT1-010", "BT1-001"],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDp = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(baseDp);
  });

  it("may decline the inherited return cost and gains no DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] }],
          trash: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-028"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDp = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(baseDp);
  });
});

describe("P-047 AeroVeedramon Zero — KB Q&A rulings", () => {
  it("still activates with 2 or fewer deck cards, trashing what it can and getting +3000 DP with a Tamer (Q4163)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "base" }, { card: "BT1-089" }],
          hand: [{ card: "P-047", as: "source" }],
          deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-009", as: "trashed" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("base").currentDP === s.perm("base").baseDP + 3000);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashed").instanceId]);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP + 3000);
  });

  function inheritedAttack() {
    return setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] }],
          trash: [
            { card: "BT1-009", as: "trashA" },
            { card: "BT1-086", as: "trashB" },
            { card: "BT1-094", as: "trashC" },
          ],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
  }

  async function attackPlayer(s: ReturnType<typeof setupEngine>) {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 0);
  }

  it("lets the opponent see which trash cards its inherited effect returns to the deck bottom (Q4164)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] }],
          trash: [
            { card: "BT1-009", as: "trashA" },
            { card: "BT1-086", as: "trashB" },
            { card: "BT1-094", as: "trashC" },
          ],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoOrderCards: true },
    );
    await s.ready();
    const trashIds = ["trashA", "trashB", "trashC"].map((alias) => s.inst(alias).instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
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

  it("always gives +2000 DP once the 3 cards are returned, with no separate choice to skip it (Q4165)", async () => {
    const s = inheritedAttack();
    await s.ready();
    const baseDP = s.perm("attacker").baseDP;

    await attackPlayer(s);
    await settle(() => s.perm("attacker").currentDP === baseDP + 2000);

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(baseDP + 2000);
  });
});
