import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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

  it.each([
    ["the exact Tamer name", "BT24-088"],
    ["a level 4 TS Digimon", "BT24-010"],
    ["a level 3 Digimon with Three Musketeers in its text", "BT21-054"],
  ])("returns itself to deck bottom to play %s from trash (Q5678)", async (_label, targetCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "asuna" }],
          trash: [{ card: targetCard, as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("asuna"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("asuna").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("target").instanceId);
  });

  it("does not return itself or play a card while at 5 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "asuna" }],
          trash: [{ card: "BT24-010", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("asuna"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  });

  it("Q5679: does not activate the start-of-turn effect on the Asuna it just played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-088", as: "source" }],
          trash: [
            { card: "BT24-088", as: "replacement" },
            { card: "BT24-010", as: "stillInTrash" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("replacement").instanceId);
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.StartOfYourTurn);

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("replacement").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("stillInTrash").instanceId);
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
          battleArea: [{ card: "BT24-088", as: "asuna" }],
          hand: [
            { card: "BT21-054", as: "cost" },
            { card: "BT1-001", as: "unrelated" },
          ],
          deck: [
            { card: "BT1-002", as: "drawn1" },
            { card: "BT1-003", as: "drawn2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("asuna"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("unrelated").instanceId,
        s.inst("drawn1").instanceId,
        s.inst("drawn2").instanceId,
      ]),
    );
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-088", as: "asuna" }],
          hand: [{ card: "BT21-054", as: "cost" }],
          deck: [
            { card: "BT1-002", as: "drawn1" },
            { card: "BT1-003", as: "drawn2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("asuna"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("asuna").instanceId),
    );
  });
});
