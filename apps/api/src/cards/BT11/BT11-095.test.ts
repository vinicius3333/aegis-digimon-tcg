import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-095.js";
describe("BT11-095 Taiki, Kiriha, & Nene", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-095")).toMatchObject({
      cardId: "BT11-095",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["Xros Heart", "BlueFlare", "General"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          { kind: "GainMemory", amount: 1 },
          { kind: "Draw", amount: 1 },
        ],
      },
      { trigger: "YourTurn", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("places a Xros Heart card, gains memory and draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-095", as: "tamer" },
            { card: "BT1-086", as: "spare" },
          ],
          hand: [{ card: "BT10-008", as: "material" }],
          deck: [
            { card: "BT1-009", as: "normalDraw" },
            { card: "BT1-010", as: "effectDraw" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined && s.perm("tamer").stack.length === 1);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("material").instanceId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("normalDraw").instanceId, s.inst("effectDraw").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.security).toHaveLength(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not gain memory, place a card or draw by the effect when its placement cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-095", as: "tamer" },
            { card: "BT1-086", as: "spare" },
          ],
          hand: [{ card: "BT10-008", as: "material" }],
          deck: [
            { card: "BT1-009", as: "normalDraw" },
            { card: "BT1-010", as: "effectDraw" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 2);

    expect(s.state.memory).toBe(3);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("material").instanceId, s.inst("normalDraw").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.security).toHaveLength(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("suspends itself to use a card under another Tamer for DigiXros", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-095", as: "expander" },
          { card: "BT10-087", as: "otherTamer", under: [{ card: "BT10-008", as: "shoutmon" }] },
        ],
        hand: [{ card: "BT10-009", as: "xros" }],
      },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("shoutmon").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT10-009"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT10-009")!;
    expect(played.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("shoutmon").instanceId);
    expect(s.perm("otherTamer").stack).toHaveLength(0);
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not allow a card under a Digimon to be used as DigiXros material", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-095", as: "expander" },
          { card: "BT10-009", as: "digimon", under: [{ card: "BT10-008", as: "shoutmon" }] },
        ],
        hand: [{ card: "BT10-009", as: "xros" }],
      },
    });
    s.state.memory = 9;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("shoutmon").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("expander").isSuspended).toBe(false);
  });
});
