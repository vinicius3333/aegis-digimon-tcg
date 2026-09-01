import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-015.js";
import "./BT26-015.js";
import "./BT26-009.js";
import "./BT26-023.js";

describe("BT26-015 compiled fidelity", () => {
  it("encodes the shared play/evolution debuff, trash return deletion, and deck-add buff attack", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "ModifyDP", amount: -4000 },
      { kind: "Return", to: "deckBottom", trackCount: "returnedTrash" },
      { kind: "Delete", condition: { kind: "ifThisEffectActed" } },
    ]);
    expect(card?.effects?.[2]?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenEffectAddsToDeck",
        actions: [{ kind: "SelectBind" }, { kind: "ModifyDP", amount: 3000 }, { kind: "Attack" }],
      },
    ]);
  });

  it("digivolves for 3 over an off-color TS Lv.4 and rejects a non-TS peer", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT24-002", as: "tsEgg" },
        hand: [
          { card: "BT26-009", as: "tsRookie" },
          { card: "BT24-022", as: "tsBase" },
          { card: "BT26-015", as: "butenmon" },
        ],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("tsRookie").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsEgg").topCard.cardId === "BT26-009");
    expect(legal.perm("tsEgg").stack.map((card) => card.cardId)).toEqual(["BT24-002"]);

    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("tsBase").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsEgg").topCard.cardId === "BT24-022");
    expect(legal.perm("tsEgg").stack.map((card) => card.cardId)).toEqual(["BT24-002", "BT26-009"]);

    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("butenmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsEgg").topCard.cardId === "BT26-015");
    expect(legal.perm("tsEgg").stack.map((card) => card.cardId)).toEqual(["BT24-002", "BT26-009", "BT24-022"]);
    expect(legal.state.memory).toBe(0);

    legal.state.phase = Phase.Breeding;
    expect(
      legal.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: legal.perm("tsEgg").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.state.phase === Phase.Main && legal.perm("tsEgg").topCard.cardId === "BT26-015");

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "plainBlue" }],
        hand: [{ card: "BT26-015", as: "butenmon" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainBlue").permanentId,
        instanceId: illegal.inst("butenmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("publicly applies the play/evolution debuff, returns trash to deck, and deletes only after that return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "butenmon" }],
          trash: [{ card: "BT1-011", as: "returned" }],
          deck: [{ card: "BT1-002", as: "deckCard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 4000 },
            { card: "BT1-010", as: "high", dp: 9000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("butenmon"));
    await settle(() => s.state.players[0]!.trash.length === 0);

    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-011");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("high").currentDP).toBe(9000);
  });

  it("may decline the trash return while still applying the mandatory DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "butenmon" }],
          trash: [{ card: "BT1-011", as: "notReturned" }],
        },
        1: { battleArea: [{ card: "BT26-014", as: "target", dp: 9000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("butenmon"));

    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("notReturned").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q6971 finishes the effect before the zero-DP rule check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "butenmon" }],
          trash: [{ card: "BT1-011", as: "returned" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "zeroDpTarget", dp: 4000 },
            { card: "BT1-010", as: "deleteBoundary", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const zeroDpTargetId = s.perm("zeroDpTarget").permanentId;
    const deleteBoundaryId = s.perm("deleteBoundary").permanentId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("butenmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    const targetDecisions = s.decisions.filter(({ req }) => req.kind === "chooseTargets");
    expect(targetDecisions).toHaveLength(2);
    expect(new Set(targetDecisions[1]!.req.options?.candidateInstanceIds)).toEqual(
      new Set([zeroDpTargetId, deleteBoundaryId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("returned").instanceId);
  });

  it("Q6972/Q6975 reacts to your effect adding an opponent's Digimon to their deck", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-015", as: "butenmon" },
            { card: "BT26-014", as: "attacker" },
          ],
          hand: [
            { card: "BT26-023", as: "mojyamon" },
            { card: "BT1-001", as: "material" },
          ],
        },
        1: {
          battleArea: [{ card: "BT26-039", as: "returnedOpponent" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("material").instanceId,
      s.perm("returnedOpponent").permanentId,
      s.perm("attacker").permanentId,
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mojyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("returnedOpponent").instanceId);
    expect(s.perm("attacker").currentDP).toBe(10000);
    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("Q6974 reacts after an effect removes a deck card and then adds a card to that deck", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-015", as: "butenmon" },
            { card: "BT26-011", as: "sourceHost", under: [{ card: "BT26-009" }] },
            { card: "BT26-014", as: "attacker" },
          ],
          hand: [{ card: "BT1-009", as: "bottom" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("bottom").instanceId, s.perm("attacker").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sourceHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.perm("attacker").currentDP).toBe(10000);
    // CR 11-2-4: the reactive attack is mandatory only when possible. This trigger
    // occurs during sourceHost's open attack, so another declaration can't be made.
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.perm("sourceHost").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Q6973 does not react when a revealed card is merely restored to the deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-015", as: "butenmon" },
          { card: "BT26-014", as: "candidate" },
        ],
        deck: [{ card: "BT1-001", as: "revealed" }],
      },
      1: { security: ["BT1-002"] },
    });
    await s.ready();

    const revealed = s.state.players[0]!.deck.pop()!;
    s.state.players[0]!.deck.push(revealed);

    expect(s.perm("candidate").currentDP).toBe(7000);
    expect(s.perm("candidate").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may decline the deck-add buff without gaining DP or attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-015", as: "butenmon" },
            { card: "BT26-014", as: "candidate" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenEffectAddsToDeck", {
      effectAddedToDeckSeat: 0,
      effectAddedToDeckBySeat: 0,
      byEffectCardId: "BT26-015",
    });

    expect(s.perm("candidate").currentDP).toBe(7000);
    expect(s.perm("candidate").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("unsuspends an inherited host when your effect adds to your deck, only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-009", as: "host", suspended: true, under: [{ card: "BT26-015" }] },
            { card: "BT1-009", as: "plainHost", suspended: true, under: [{ card: "BT26-015" }] },
          ],
          trash: [
            { card: "BT1-011", as: "first" },
            { card: "BT1-012", as: "second" },
          ],
          deck: [
            { card: "BT1-003", as: "firstDeck" },
            { card: "BT1-004", as: "secondDeck" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToDeck", {
      effectAddedToDeckSeat: 0,
      effectAddedToDeckBySeat: 0,
      byEffectCardId: "BT26-015",
    });
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("plainHost").isSuspended).toBe(true);

    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenEffectAddsToDeck", {
      effectAddedToDeckSeat: 0,
      effectAddedToDeckBySeat: 0,
      byEffectCardId: "BT26-015",
    });
    expect(s.perm("host").isSuspended).toBe(true);
  });
});
