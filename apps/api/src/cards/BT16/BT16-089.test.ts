import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-089.js";
import "../index.js";

describe("BT16-089", () => {
  it("reduces Arukenimon or Mummymon play cost by 3 by deleting this Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { zone: "hand" },
          actions: [
            {
              kind: "Replacement",
              mode: "reduceCost",
              amount: 3,
              cost: { kind: "deleteOwn" },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
  });

  it("plays a Myotismon-text level 5 or lower Digimon from trash on deletion and deletes itself later", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true },
        { kind: "DelayedDelete", timing: "endOfOpponentTurn" },
      ],
    });
  });

  it("plays itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("deletes this Tamer to reduce a natural Arukenimon/Mummymon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-089", as: "sacrifice" }],
          hand: [{ card: "BT16-089", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("revives a Myotismon-text Digimon from trash and deletes it at the next opponent turn end", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-072", as: "base" },
            { card: "BT16-089", as: "sacrifice" },
          ],
          hand: [{ card: "BT16-081", as: "malo" }],
          trash: [{ card: "BT15-070", as: "revived" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-090", "BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("sacrifice").permanentId, s.perm("sacrifice").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("malo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-070"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-070")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-070")).toBe(false);
  });
});
