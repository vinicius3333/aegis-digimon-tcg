import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-006.js";
import "../index.js";

describe("EX5-006 Xiaomon", () => {
  it("matches the catalog and encodes the inherited once-per-turn effect-play draw", () => {
    expect(getCardDefinition("EX5-006")).toMatchObject({
      cardId: "EX5-006",
      nameEn: "Xiaomon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      dp: 0,
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When an effect plays one of your Digimon, ＜Draw 1＞ (Draw 1 card from your deck).",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", byEffect: true, kind: ["Digimon"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("does not draw for a manually played Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-006"] }],
        hand: [{ card: "BT1-010", as: "manual" }],
        deck: [{ card: "BT1-011", as: "watcher" }],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010"));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("watcher").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("draws once for effect-played Digimon, refuses a same-turn repeat, and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX5-006"] },
            { card: "BT1-010", as: "peerOne" },
            { card: "BT1-011", as: "peerTwo" },
          ],
          hand: [
            { card: "EX5-058", as: "sourceOne" },
            { card: "EX5-058", as: "sourceTwo" },
            { card: "EX5-058", as: "sourceThree" },
          ],
          deck: [{ card: "BT1-010", as: "firstEffectDraw" }, { card: "BT1-012", as: "nextTurnDraw" }, "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "TOKEN-Fujitsumon-Token").length === 1,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("firstEffectDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("nextTurnDraw").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "TOKEN-Fujitsumon-Token").length === 2,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("nextTurnDraw").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceThree").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "TOKEN-Fujitsumon-Token").length === 3,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nextTurnDraw").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("keeps the inherited effect-play draw through a legal evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX5-006"] },
            { card: "BT1-010", as: "peerOne" },
            { card: "BT1-011", as: "peerTwo" },
          ],
          hand: [
            { card: "BT1-014", as: "evolution" },
            { card: "EX5-058", as: "source" },
          ],
          deck: [{ card: "BT1-010", as: "evolutionDraw" }, { card: "BT1-012", as: "effectDraw" }, "BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-014");
    expect(s.perm("host").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-006", "BT1-009"]);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-058", "BT1-010"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Fujitsumon-Token") &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("effectDraw").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("effectDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("rejects an evolution whose source level does not match the legal route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-006"] }],
        hand: [{ card: "BT1-013", as: "invalid" }],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("invalid").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("host").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-006"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
