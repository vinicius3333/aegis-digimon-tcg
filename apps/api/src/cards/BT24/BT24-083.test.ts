import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_083 } from "./BT24-083.js";
import "../index.js";

describe("BT24-083 Hiroko Sagisaka", () => {
  it("returns itself to deck bottom and offers Hiroko or a qualifying TS Digimon", () => {
    const start = BT24_083.effects?.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(start?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["Hiroko Sagisaka"], match: "nameExact" }],
        },
        orFilters: [
          {
            kind: ["Digimon"],
            dp: { op: "lte", value: 5000 },
            nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
          },
        ],
      },
      cost: { kind: "return", to: "deckBottom" },
    });
    expect(BT24_083.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
    });
  });

  it("returns itself at 4 memory and plays a 5000-DP-or-less TS Digimon without a level ceiling", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "hiroko" }],
          hand: [
            { card: "BT24-022", as: "tooLarge" },
            { card: "BT24-011", as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("tooLarge").instanceId, s.inst("eligible").instanceId);
    s.state.memory = 4;
    const sourceId = s.perm("hiroko").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourTurn, s.perm("hiroko"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("eligible").instanceId,
      ),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooLarge").instanceId);
  });

  it("does not return itself or play a card above 4 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "hiroko" }],
          hand: [{ card: "BT24-013", as: "eligible" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourTurn, s.perm("hiroko"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
  });

  it("Q5667: does not activate the start-of-turn effect on a Hiroko played during that window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "source" }],
          hand: [
            { card: "BT24-083", as: "replacement" },
            { card: "BT24-011", as: "stillInHand" },
          ],
          deck: [
            { card: "BT1-009", as: "deckA" },
            { card: "BT1-010", as: "deckB" },
            { card: "BT1-011", as: "deckC" },
            { card: "BT1-012", as: "deckD" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("replacement").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("stillInHand").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(s.inst("replacement").instanceId);
    expect(s.state.memory).toBe(4);
    expect(
      s.state.players[0]!.battleArea.filter((p) => p.topCard.instanceId === s.inst("replacement").instanceId),
    ).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("runs the Start of Your Turn effect through the natural turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "hiroko" }],
          hand: [{ card: "BT24-013", as: "eligible" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eligible").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("hiroko").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not return Hiroko or play a TS card at 5 memory in a real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "hiroko" }],
          hand: [{ card: "BT24-011", as: "eligible" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 5);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("hiroko").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(s.inst("hiroko").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly filters a mixed hand to the TS Digimon at 5000 DP or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "source" }],
          hand: [
            { card: "BT24-022", as: "tooLarge" },
            { card: "BT24-011", as: "eligible" },
          ],
          deck: [
            { card: "BT1-009", as: "deckA" },
            { card: "BT1-010", as: "deckB" },
            { card: "BT1-011", as: "deckC" },
            { card: "BT1-012", as: "deckD" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eligible").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooLarge").instanceId);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("source").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly refuses the optional Start of Your Turn replacement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "source" }],
          hand: [{ card: "BT24-011", as: "eligible" }],
          deck: [
            { card: "BT1-009", as: "deckA" },
            { card: "BT1-010", as: "deckB" },
            { card: "BT1-011", as: "deckC" },
            { card: "BT1-012", as: "deckD" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deckA").instanceId,
      s.inst("deckB").instanceId,
      s.inst("deckC").instanceId,
      s.inst("deckD").instanceId,
    ]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("reveals three, adds one TS card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "hiroko" }],
          deck: [
            { card: "BT24-013", as: "ts" },
            { card: "BT1-009", as: "missA" },
            { card: "BT1-010", as: "missB" },
            { card: "BT1-011", as: "filler" },
          ],
        },
      },
      { autoOrderCards: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("hiroko"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ts").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("missA").instanceId, s.inst("missB").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("filler").instanceId);
  });

  it("publicly plays Hiroko and reveals exactly three cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-083", as: "hiroko" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT24-011", as: "tsTop" },
            { card: "BT1-009", as: "missA" },
            { card: "BT1-010", as: "missB" },
            { card: "BT1-011", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiroko").instanceId })).toEqual({
      ok: true,
    });
    expect(s.state.memory).toBe(7);
    await settle(
      () =>
        s.state.memory === 7 && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tsTop").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("hiroko").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tsTop").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("missA").instanceId,
      s.inst("missB").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-083", as: "hiroko" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("hiroko"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("hiroko").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("hiroko").instanceId),
    ).toBe(true);
  });

  it("publicly plays itself from security and resolves its reveal", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT24-083", as: "hiroko" },
            { card: "BT1-014", as: "remainingSecurity" },
          ],
          deck: [
            { card: "BT24-011", as: "ts" },
            { card: "BT1-009", as: "missA" },
            { card: "BT1-010", as: "missB" },
            { card: "BT1-014", as: "untouched" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(s.inst("hiroko").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("hiroko").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ts").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("missA").instanceId,
      s.inst("missB").instanceId,
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
