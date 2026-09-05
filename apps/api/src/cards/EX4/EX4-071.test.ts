import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-071.js";

describe("EX4-071 Ame-no-Ohabari", () => {
  it("deletes an opposing Digimon at or below the level of the own Digimon sacrificed", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "Delete",
      cost: { kind: "deleteOwn", bindResultAs: "deleted" },
      target: { filter: { controller: "opponent", levelComparison: { op: "lte", relativeTo: "lastDeleted" } } },
    });
  });
  it("plays Ravemon from trash at opponent turn end when the sacrificed card was Ravemon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({
      kind: "SubTrigger",
      event: "endOfOpponentTurn",
      condition: { kind: "bindingContains", ref: "deleted" },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          target: {
            location: "trash",
            controller: "mine",
            filter: { nameOrTrait: [{ tokens: ["Ravemon"], match: "nameExact" }] },
          },
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-071");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("plays Ravemon from trash at the opponent's turn end after sacrificing Ravemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-064", as: "tamer" },
            { card: "EX4-058", as: "sacrifice" },
          ],
          hand: [{ card: "EX4-071", as: "option" }],
          trash: [{ card: "EX4-058", as: "revive" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === optionId) &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-058"),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revive").instanceId)).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfOpponentTurn");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-058"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-058")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revive").instanceId)).toBe(false);
  });

  it("does not schedule Ravemon recovery when a non-Ravemon pays the deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-064", as: "tamer" },
            { card: "BT1-064", as: "sacrifice" },
          ],
          hand: [{ card: "EX4-071", as: "option" }],
          trash: [{ card: "EX4-058", as: "revive" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-064")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfOpponentTurn");
    await settle(() => false, 60);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-058")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revive").instanceId)).toBe(true);
  });

  it("does not play Ravemon: Burst Mode for the exact Ravemon target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-064", as: "tamer" },
            { card: "EX4-058", as: "sacrifice" },
          ],
          hand: [{ card: "EX4-071", as: "option" }],
          trash: [{ card: "BT13-092", as: "burstRavemon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfOpponentTurn");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-092")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("burstRavemon").instanceId)).toBe(true);
  });

  ex4CardBehaviorTests("EX4-071");
});
