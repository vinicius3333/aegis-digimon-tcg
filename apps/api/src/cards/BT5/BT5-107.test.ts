import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT13/BT13-080.js";
import "./BT5-107.js";

describe("BT5-107 Revive From the Darkness!", () => {
  it("deletes a purple Digimon, plays a level 5-or-lower purple Digimon, and suppresses On Play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-071", as: "cost" },
            { card: "BT5-068", as: "boardWrongColor" },
          ],
          hand: [{ card: "BT5-107", as: "option" }],
          trash: [
            { card: "BT13-080", as: "played" },
            { card: "BT5-060", as: "wrongColor" },
            { card: "BT5-080", as: "wrongLevel" },
          ],
          deck: ["BT5-071"],
        },
        1: { battleArea: [{ card: "BT5-071", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("played").instanceId);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT5-071")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT5-068")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongColor").instanceId, s.inst("wrongLevel").instanceId]),
    );
  });

  it("plays the exact level-5 boundary from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-071", as: "cost" }],
          hand: [{ card: "BT5-107", as: "option" }],
          trash: [{ card: "BT5-077", as: "level5" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT5-077"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT5-071")).toBe(false);
  });

  it("may decline the optional trash play after the required deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-071", as: "cost" }],
          hand: [{ card: "BT5-107", as: "option" }],
          trash: [{ card: "BT13-080", as: "candidate" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 6;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost").instanceId, s.inst("candidate").instanceId]),
    );
  });

  it("does not play a purple Digimon above level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-080", as: "cost" }],
          hand: [{ card: "BT5-107", as: "option" }],
          trash: [{ card: "BT5-080", as: "tooHigh" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-107", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
