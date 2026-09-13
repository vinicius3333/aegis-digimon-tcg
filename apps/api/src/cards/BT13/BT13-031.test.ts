import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-031.js";
import "../ST1/ST1-16.js";
import "../ST2/ST2-16.js";
import "./BT13-097.js";

describe("BT13-031 MirageGaogamon", () => {
  it("registers Evade, Tamer bounce, and the once-per-turn Thomas trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Evade" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Return", to: "hand", target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Thomas H. Norstein"] }] },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("plays Thomas when an effect adds a card to the opponent's hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-031", as: "mirage" }], hand: [{ card: "BT13-097", as: "thomas" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 0 });
    expect(s.state.players[0]!.hand).toContain(s.inst("thomas"));

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097"),
      3000,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097")).toBe(true);
  });

  it("returns only an opposing Tamer when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-029", as: "base" }],
          hand: [{ card: "BT13-031", as: "mirage" }],
        },
        1: {
          battleArea: [
            { card: "BT9-086", as: "tamer" },
            { card: "BT13-021", as: "digimon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const tamerTop = s.perm("tamer").topCard;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mirage").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.includes(tamerTop));

    expect(s.state.players[1]!.hand).toContain(tamerTop);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("digimon"));
    expect(s.state.memory).toBe(2);
  });

  it("uses Evade to suspend and prevent a public opposing Gaia Force deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-031", as: "mirage" }] },
      1: { battleArea: [{ card: "BT1-010", as: "redSource" }], hand: [{ card: "ST1-16", as: "gaia" }] },
    });
    const mirageId = s.perm("mirage").permanentId;
    const gaiaId = s.inst("gaia").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: gaiaId })).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: mirageId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === gaiaId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("mirage").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("mirage"));
  });

  it("plays at most one Thomas per turn for public returns and resets after actual turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-031", as: "mirage" }],
          hand: [
            { card: "BT13-097", as: "first-thomas" },
            { card: "BT13-097", as: "second-thomas" },
            { card: "ST2-16", as: "firstOption" },
            { card: "ST2-16", as: "secondOption" },
            { card: "ST2-16", as: "thirdOption" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "firstTarget" },
            { card: "BT1-015", as: "secondTarget" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstThomasId = s.inst("first-thomas").instanceId;
    const secondThomasId = s.inst("second-thomas").instanceId;
    const targetId = s.inst("firstTarget").instanceId;
    const otherTargetId = s.inst("secondTarget").instanceId;
    const firstOptionId = s.inst("firstOption").instanceId;
    const secondOptionId = s.inst("secondOption").instanceId;
    const thirdOptionId = s.inst("thirdOption").instanceId;
    const mirageId = s.perm("mirage").topCard.instanceId;
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: firstOptionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === firstThomasId));
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(targetId);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondOptionId })).toEqual({ ok: true });
    await ownTurn;
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(otherTargetId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(secondThomasId);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT13-097")).toHaveLength(1);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: targetId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === targetId));
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: thirdOptionId })).toEqual({ ok: true });
    await nextOwnTurn;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === secondThomasId)).toBe(true);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(targetId);
    expect(s.perm("mirage").topCard.instanceId).toBe(mirageId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstOptionId, secondOptionId, thirdOptionId]),
    );
  });

  it("allows its controller to decline playing Thomas", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-031", as: "mirage" }],
          hand: [
            { card: "BT13-097", as: "thomas" },
            { card: "ST2-16", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.state.players[0]!.hand).toContain(s.inst("thomas"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("exposes Evade as an active keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-031", as: "mirage" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mirage"), "Evade")).toBe(true);
  });
});
