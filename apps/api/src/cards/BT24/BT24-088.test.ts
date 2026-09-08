import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_088 } from "./BT24-088.js";
import "../index.js";

describe("BT24-088 Asuna Shiroki", () => {
  it("returns itself to the bottom of the deck before the optional trash play", () => {
    const start = BT24_088.effects?.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(start?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: {
        filter: { nameOrTrait: [{ tokens: ["Asuna Shiroki"], match: "nameExact" }] },
        orFilters: [
          { kind: ["Digimon"], levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ match: "trait" }] },
          { kind: ["Digimon"], levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ match: "any" }] },
        ],
      },
      condition: { kind: "memoryAtMost", value: 4 },
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true }, isSelf: true } },
      optional: true,
      abortOnDecline: true,
    });
    expect(BT24_088.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { isSelfRef: true }, isSelf: true },
      payCost: false,
    });
  });

  it("selects only the exact-name or level-4-or-lower TS target from a mixed trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "asuna" }],
          hand: [{ card: "BT1-009", as: "mainSpare" }],
          deck: [{ card: "BT1-013", as: "deckFirst" }],
          trash: [
            { card: "BT24-010", as: "validTs" },
            { card: "BT24-014", as: "tooHighTs" },
            { card: "BT1-014", as: "nonTs" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("validTs").instanceId);
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("validTs").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("validTs").instanceId)
        ?.topCard.cardId,
    ).toBe("BT24-010");
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toEqual([
      s.inst("tooHighTs").instanceId,
      s.inst("nonTs").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((instance) => instance.instanceId)).toEqual([
      s.inst("deckFirst").instanceId,
      s.inst("asuna").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it.each([
    ["the exact Tamer name", "BT24-088"],
    ["a level 4 TS Digimon", "BT24-010"],
    ["a level 3 Digimon with Three Musketeers in its text", "BT21-054"],
  ])("returns itself to deck bottom to play %s from trash (Q5678)", async (_label, targetCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "asuna" }],
          hand: [{ card: "BT1-009", as: "mainSpare" }],
          deck: [
            { card: "BT1-013", as: "deckFirst" },
            { card: "BT1-014", as: "deckSecond" },
          ],
          trash: [{ card: targetCard, as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("target").instanceId,
    );
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deckFirst").instanceId,
      s.inst("deckSecond").instanceId,
      s.inst("asuna").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("target").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not replace itself when the trash has no eligible target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "asuna" }],
          hand: [{ card: "BT1-009", as: "mainSpare" }],
          deck: [{ card: "BT1-013", as: "deckFirst" }],
          trash: [
            { card: "BT24-014", as: "tooHighTs" },
            { card: "BT1-014", as: "nonTs" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("asuna").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((instance) => instance.instanceId)).toEqual([s.inst("deckFirst").instanceId]);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toEqual([
      s.inst("tooHighTs").instanceId,
      s.inst("nonTs").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not return itself or play a card while at 5 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "asuna" }],
          hand: [{ card: "BT1-009", as: "mainSpare" }],
          deck: [
            { card: "BT1-013", as: "deckFirst" },
            { card: "BT1-014", as: "deckSecond" },
          ],
          trash: [{ card: "BT24-010", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deckFirst").instanceId,
      s.inst("deckSecond").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.perm("asuna").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("may decline the Start of Your Turn return and optional trash play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "asuna" }],
          hand: [{ card: "BT1-009", as: "mainSpare" }],
          deck: [
            { card: "BT1-013", as: "deckFirst" },
            { card: "BT1-014", as: "deckSecond" },
          ],
          trash: [{ card: "BT24-010", as: "target" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("asuna").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deckFirst").instanceId,
      s.inst("deckSecond").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("Q5679: does not activate the start-of-turn effect on the Asuna it just played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "source" }],
          hand: [{ card: "BT1-009", as: "mainSpare" }],
          deck: [
            { card: "BT1-013", as: "deckFirst" },
            { card: "BT1-014", as: "deckSecond" },
          ],
          trash: [
            { card: "BT24-088", as: "replacement" },
            { card: "BT24-010", as: "stillInTrash" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("replacement").instanceId);
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("replacement").instanceId,
      ),
    ).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.deck.map((instance) => instance.instanceId)).toEqual([
      s.inst("deckFirst").instanceId,
      s.inst("deckSecond").instanceId,
      s.inst("source").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("stillInTrash").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("runs the Start of Your Turn effect through the natural turn window", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-088", as: "asuna" }], trash: [{ card: "BT24-013", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("target").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT24-088")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("trashes a qualifying hand card to draw 2 on play (Q5677)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-088", as: "asuna" },
            { card: "BT21-054", as: "cost" },
            { card: "BT1-013", as: "unrelated" },
          ],
          deck: [
            { card: "BT1-015", as: "drawn1" },
            { card: "BT1-045", as: "drawn2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    preferred.push(s.inst("cost").instanceId);
    await s.ready();

    const asunaId = s.inst("asuna").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: asunaId })).toEqual({ ok: true });
    await settle(
      () =>
        s.decisions.some(({ req }) => req.kind === "optional") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === asunaId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("unrelated").instanceId,
      s.inst("drawn1").instanceId,
      s.inst("drawn2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may decline the On Play hand-trash cost without drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-088", as: "asuna" },
            { card: "BT21-054", as: "cost" },
          ],
          deck: [
            { card: "BT1-015", as: "drawn1" },
            { card: "BT1-045", as: "drawn2" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const asunaId = s.inst("asuna").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: asunaId })).toEqual({ ok: true });
    await settle(
      () =>
        s.decisions.some(({ req }) => req.kind === "optional") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === asunaId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(asunaId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("drawn1").instanceId,
      s.inst("drawn2").instanceId,
    ]);
  });

  it("accepts a TS Option as the On Play hand cost and draws 2", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-088", as: "asuna" },
            { card: "BT24-092", as: "tsOption" },
            { card: "BT1-013", as: "unrelated" },
          ],
          deck: [
            { card: "BT1-015", as: "drawn1" },
            { card: "BT1-045", as: "drawn2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("tsOption").instanceId);
    s.state.memory = 3;
    await s.ready();
    const asunaId = s.inst("asuna").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: asunaId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(asunaId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("tsOption").instanceId);
    expect(s.state.players[0]!.hand.map((instance) => instance.instanceId)).toEqual([
      s.inst("unrelated").instanceId,
      s.inst("drawn1").instanceId,
      s.inst("drawn2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not draw when the On Play hand contains only a non-TS, non-Three-Musketeers card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-088", as: "asuna" },
            { card: "BT1-013", as: "unrelated" },
          ],
          deck: [
            { card: "BT1-015", as: "drawn1" },
            { card: "BT1-045", as: "drawn2" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const asunaId = s.inst("asuna").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: asunaId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === asunaId));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(asunaId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((instance) => instance.instanceId)).toEqual([s.inst("unrelated").instanceId]);
    expect(s.state.players[0]!.deck.map((instance) => instance.instanceId)).toEqual([
      s.inst("drawn1").instanceId,
      s.inst("drawn2").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-088", as: "asuna" }],
          deck: [
            { card: "BT1-015", as: "drawn1" },
            { card: "BT1-045", as: "drawn2" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("asuna").instanceId,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays from security on a public opponent attack and accepts its qualifying On Play cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-088", as: "asuna" }],
          hand: [{ card: "BT21-054", as: "cost" }],
          deck: [
            { card: "BT1-015", as: "drawn1" },
            { card: "BT1-045", as: "drawn2" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const asunaId = s.inst("asuna").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(asunaId);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((instance) => instance.instanceId)).toEqual([
      s.inst("drawn1").instanceId,
      s.inst("drawn2").instanceId,
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
