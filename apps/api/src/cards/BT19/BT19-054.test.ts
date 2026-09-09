import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// BT19-054 MegaGargomon (Green, Lv.6, Vaccine, Machine, DP 13000, play 13, evolve Green Lv.5 for 5)
//   ＜Security A. +1＞
//   [When Digivolving] [When Attacking] You may return 1 of your opponent's suspended
//   Digimon to the bottom of the deck.
// KB: `node tools/kb/query.mjs card BT19-054` -> "(no knowledge-base entries)". No Q&A to cover.

describe("BT19-054 MegaGargomon", () => {
  it("matches the catalog print and carries no inherited effect", () => {
    const definition = getCardDefinition("BT19-054")!;
    expect(definition).toMatchObject({
      cardId: "BT19-054",
      nameEn: "MegaGargomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Machine"],
      evoCosts: [{ color: "Green", level: 5, memoryCost: 5 }],
    });
    expect(definition.effectText).toContain("＜Security A. +1＞");
    expect(definition.effectText).toContain(
      "[When Digivolving] [When Attacking] You may return 1 of your opponent's suspended Digimon to the bottom of the deck.",
    );
    expect(definition.inheritedEffectText).toBeUndefined();
  });

  it("publicly digivolves off a green Lv.5 for 5, keeping the source stack and drawing 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-050", as: "base" }],
          hand: [{ card: "BT19-054", as: "mega" }],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
          security: ["BT1-012"],
        },
        1: { security: ["BT1-013"], deck: ["BT1-014"] },
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const baseInstanceId = s.perm("base").topCard!.instanceId;
    const megaInstanceId = s.inst("mega").instanceId;
    const handBefore = s.state.players[0]!.hand.length;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: megaInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === megaInstanceId);

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.memory).toBe(1);
    // Digivolve bonus draw: the pre-digivolve hand held only MegaGargomon, which left the hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(handBefore).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses a green Lv.4 source and a non-green Lv.5 source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-046", as: "greenLv4" },
            { card: "BT19-025", as: "blueBlackLv5" },
          ],
          hand: [{ card: "BT19-054", as: "mega" }],
          deck: ["BT1-010"],
          security: ["BT1-012"],
        },
        1: { security: ["BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 9;
    await s.ready();
    const megaInstanceId = s.inst("mega").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenLv4").permanentId,
        instanceId: megaInstanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBlackLv5").permanentId,
        instanceId: megaInstanceId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([megaInstanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT19-046",
      "BT19-025",
    ]);
    expect(s.state.memory).toBe(9);
  });

  it("[When Digivolving] bottoms only the opponent's SUSPENDED Digimon, never an active one or your own", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-050", as: "base" },
            { card: "BT1-009", as: "mySuspended", suspended: true },
          ],
          hand: [{ card: "BT19-054", as: "mega" }],
          deck: ["BT1-010"],
          security: ["BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "theirSuspended", suspended: true },
            { card: "BT1-015", as: "theirActive" },
          ],
          deck: [{ card: "BT1-014", as: "deckBottomBefore" }],
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const suspendedInstanceId = s.perm("theirSuspended").topCard!.instanceId;
    const mySuspendedInstanceId = s.perm("mySuspended").topCard!.instanceId;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // Only the suspended opponent body left; the active peer and our own suspended peer stay.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-015"]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deckBottomBefore").instanceId,
      suspendedInstanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(
      mySuspendedInstanceId,
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the optional return, leaving the suspended Digimon in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-050", as: "base" }],
          hand: [{ card: "BT19-054", as: "mega" }],
          deck: ["BT1-010"],
          security: ["BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-011", as: "theirSuspended", suspended: true }],
          deck: ["BT1-014"],
          security: ["BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const suspendedInstanceId = s.perm("theirSuspended").topCard!.instanceId;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-054");

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      suspendedInstanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Attacking] bottoms a suspended opponent Digimon and ＜Security A. +1＞ checks 2 cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-054", as: "mega" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011"],
          security: ["BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "theirSuspended", suspended: true },
            { card: "BT1-015", as: "theirActive" },
          ],
          deck: [{ card: "BT1-014", as: "deckBottomBefore" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const suspendedInstanceId = s.perm("theirSuspended").topCard!.instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);

    // ＜Security A. +1＞: two security cards checked from a three-card stack.
    expect(s.state.players[1]!.security).toHaveLength(1);
    // [When Attacking]: the suspended body went to the bottom of its owner's deck.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-015"]);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(suspendedInstanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Attacking] raises no prompt when every opponent Digimon is unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-054", as: "mega" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011"],
          security: ["BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "theirActive" }],
          deck: [{ card: "BT1-014", as: "deckBottomBefore" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckBottomBefore").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("theirActive").topCard!.instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
