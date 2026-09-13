import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-083.js";

describe("BT11-083 LadyDevimon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-083")).toMatchObject({
      cardId: "BT11-083",
      colors: ["Purple"],
      level: 5,
      playCost: 7,
      dp: 6000,
      types: ["Fallen Angel"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [{ kind: "Trash" }, { kind: "Return", to: "hand" }] },
      { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
      { trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "Aura" }] },
    ]);
  });

  it("trashes 1 hand card before returning Mirei from trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base" }],
          hand: [
            { card: "BT11-083", as: "lady" },
            { card: "BT1-009", as: "discard" },
          ],
          trash: [{ card: "BT11-094", as: "mirei" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("discard").instanceId, s.inst("mirei").instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("mirei").instanceId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("discard").instanceId);
  });

  it("can return the matching card that its hand-trash step just discarded", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base" }],
          hand: [
            { card: "BT11-083", as: "lady" },
            { card: "BT11-080", as: "discarded-fallen-angel" },
            { card: "BT1-009", as: "keep" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("discarded-fallen-angel").instanceId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("discarded-fallen-angel").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("discarded-fallen-angel").instanceId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("discarded-fallen-angel").instanceId,
    );
  });

  it("does not return a card when the optional hand trash is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base" }],
          hand: [
            { card: "BT11-083", as: "lady" },
            { card: "BT1-009", as: "keep" },
          ],
          trash: [{ card: "BT11-094", as: "mirei" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("keep").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mirei").instanceId);
  });

  it("gains 1 memory once for public Mirei plays, then resets on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-083", as: "lady" }],
        hand: [
          { card: "BT11-094", as: "firstMirei" },
          { card: "BT11-094", as: "secondMirei" },
          { card: "BT11-094", as: "thirdMirei" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstId = s.inst("firstMirei").instanceId;
    const secondId = s.inst("secondMirei").instanceId;
    const thirdId = s.inst("thirdMirei").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: firstId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === firstId));
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === secondId));
    expect(s.state.memory).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const resetTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: thirdId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === thirdId));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual(
      expect.arrayContaining([firstId, secondId, thirdId]),
    );
    expect(s.state.memory).toBe(6);
    advance(s.engine).endMainPhaseIfOpen(0);
    await resetTurn;
  });

  it("inherits an opponent-turn Retaliation aura for allied Angel-family Digimon while a yellow Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-080", as: "host", under: ["BT11-083"] },
          { card: "BT11-042", as: "yellow-angel" },
          { card: "BT1-009", as: "non-angel" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("yellow-angel"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("non-angel"), "Retaliation")).toBe(false);
  });
});
