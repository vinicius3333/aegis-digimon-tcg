import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_031 } from "./BT25-031.js";
import "../index.js";

describe("BT25-031 Patamon", () => {
  it("reveals three and selects one Great Angels/Dragons card plus one TS card", () => {
    const effect = BT25_031.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels", "Four Great Dragons"], match: "trait" }],
        },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
  });

  it("keeps inherited Barrier", () => {
    expect(BT25_031.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
  });

  it("naturally plays and consumes distinct Angel and TS cards from the top three", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-031", as: "patamon" }],
          deck: [
            { card: "BT25-034", as: "angel" },
            { card: "BT25-011", as: "ts" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("angel").instanceId, s.inst("ts").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("angel").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("angel").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  it("uses the printed off-color Lv.2 TS alternate evolution on the public stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-002", as: "tsBase" }],
          hand: [{ card: "BT25-031", as: "patamon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoChooseOption: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("patamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard?.cardId === "BT25-031");
    expect(s.perm("tsBase").topCard?.cardId).toBe("BT25-031");
    expect(s.perm("tsBase").stack.map((card) => card.cardId)).toEqual(["BT24-002"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("rejects a same-level non-TS base for the alternate evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-003", as: "wrongBase" }], hand: [{ card: "BT25-031", as: "patamon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongBase").permanentId,
        instanceId: s.inst("patamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("patamon").instanceId);
  });

  it("exposes inherited Barrier through a public evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "host", under: ["BT25-031"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("accepts inherited Barrier through the public battle decision and pays one security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "host", under: ["BT25-031"], dp: 5000, suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 6000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toContain("BT1-051");
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("refuses inherited Barrier and allows the battle deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "host", under: ["BT25-031"], dp: 5000, suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 6000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: false }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("cannot pay inherited Barrier with an empty security stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "host", under: ["BT25-031"], dp: 5000, suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 6000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
  });

  it("returns an unmatched top card to the bottom while selecting Angel and TS independently", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-031", as: "patamon" }],
          deck: [
            { card: "BT1-053", as: "angelOnly" },
            { card: "BT1-009", as: "miss" },
            { card: "BT25-011", as: "ts" },
            { card: "BT1-010", as: "tail" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("angelOnly").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-053", "BT25-011"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-009"]);
  });

  it("adds nothing when the revealed cards match neither printed trait filter", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-031", as: "patamon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck[0]?.cardId === "BT1-012");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-009", "BT1-010", "BT1-011"]);
  });

  it.each([
    ["Angel", "BT1-053"],
    ["Archangel", "BT1-060"],
    ["Three Great Angels", "BT1-063"],
    ["Four Great Dragons", "BT14-018"],
  ] as const)("selects the exact %s trait branch in a public reveal", async (_branch, branchCard) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-031", as: "patamon" }],
          deck: [branchCard, "BT25-011", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === branchCard));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining([branchCard, "BT25-011"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("rejects a near-trait Fallen Angel while still taking the independent TS card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-031", as: "patamon" }], deck: ["BT11-080", "BT25-011", "BT1-009"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT25-011"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-011"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT11-080", "BT1-009"]);
  });
});
