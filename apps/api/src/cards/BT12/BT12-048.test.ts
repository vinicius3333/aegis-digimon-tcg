import { digiXrosRequirementFor, digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-048.js";

describe("BT12-048 Dracmon", () => {
  it("has the printed Save evolution and DigiXros requirements", () => {
    expect(digivolutionRequirementsFor("BT12-048")).toContainEqual({
      level: 2,
      texts: ["Save"],
      cost: 0,
      isAlternate: true,
    });
    expect(digiXrosRequirementFor("BT12-048")).toEqual([{ materials: [{ texts: ["Save"] }], count: 2 }]);
  });

  it("places up to three revealed Tamers from hand at deck bottom and draws that many", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-048", as: "dracmon" }],
          hand: [
            { card: "BT12-087", as: "tamer1" },
            { card: "BT12-087", as: "tamer2" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const handBefore = s.state.players[0]!.hand.length;

    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dracmon"));
    await settle(() => s.state.players[0]!.hand.length === handBefore);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.deck.slice(-2).map(({ instanceId }) => instanceId)).toEqual([
      s.inst("tamer1").instanceId,
      s.inst("tamer2").instanceId,
    ]);
  });

  it("resolves On Play from a public play-card intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT12-048", as: "dracmon" },
            { card: "BT12-087", as: "tamer" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-048"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-048")).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("tamer").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("does not draw or move cards when the hand has no Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-048", as: "dracmon" }],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dracmon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
  });

  it("may decline to bottom any Tamers and therefore draws nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-048", as: "dracmon" }],
          hand: [{ card: "BT12-087", as: "tamer" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dracmon"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
  });

  it("gives an inherited Save host 2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-048"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("does not give inherited DP to a non-Save host or on the opponent's turn", async () => {
    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-048"] }] } });
    await plain.ready();
    expect(plain.perm("host").currentDP).toBe(plain.perm("host").baseDP);

    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-048"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.ready();
    expect(offTurn.perm("host").currentDP).toBe(offTurn.perm("host").baseDP);
  });

  it("saves itself under a Tamer when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-048", as: "dracmon" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cardInstanceId = s.perm("dracmon").topCard.instanceId;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("dracmon").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardInstanceId));
    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardInstanceId)).toBe(true);
  });
});
