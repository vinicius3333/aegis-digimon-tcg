import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-058.js";

describe("EX4-058 Ravemon", () => {
  it("can delete itself at end of the opponent's turn to play Ravemon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "endOfOpponentTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          target: {
            location: "trash",
            controller: "mine",
            filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Ravemon"] }] },
          },
        },
      ],
      cost: {
        kind: "deleteOwn",
        target: {
          filter: {
            isSelfRef: true,
            digivolutionStackNameOrTrait: [
              { match: "trait", tokens: ["Bird"] },
              { match: "trait", tokens: ["Avian"] },
            ],
          },
        },
      },
    });
  });
  it("trashes an opponent hand card at eight or more cards, otherwise adds security to hand", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "Trash",
      target: { chooser: "opponent" },
      condition: { kind: "zoneCount", op: "gte", value: 8 },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "toHand",
      condition: { kind: "zoneCount", op: "lte", value: 7 },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-058");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("deletes itself from an Avian stack and plays Ravemon at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-058", as: "source", under: ["EX4-056"] }],
          trash: [{ card: "EX4-058", as: "ravemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX4-058")).not.toHaveLength(0);
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfOpponentTurn");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-058"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-058")).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX4-058")).toHaveLength(1);
  });

  it("does not activate the end-of-attack cost without a Bird or Avian evolution card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX4-058", as: "source", under: ["BT1-010"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"));
    await settle(() => false, 60);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("source").permanentId)).toBe(true);
  });

  it("does not play a longer Ravemon name from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-058", as: "source", under: ["EX4-056"] }],
          trash: [{ card: "BT13-092", as: "longRavemonName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfOpponentTurn");
    await settle();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("longRavemonName").instanceId);
  });

  it("trashes one card and then recovers security when the opponent starts with eight cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-058", as: "source" }] },
        1: { hand: Array(8).fill("BT1-001"), security: [{ card: "BT1-002", as: "security" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.hand.length === 8);
    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("adds security to hand without trashing when the opponent starts at seven cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-058", as: "source" }] },
        1: { hand: Array(7).fill("BT1-001"), security: [{ card: "BT1-002", as: "security" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.hand.length === 8);
    expect(s.state.players[1]!.hand.length).toBe(8);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
  ex4CardBehaviorTests("EX4-058");
});
