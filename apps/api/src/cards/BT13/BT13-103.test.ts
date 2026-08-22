import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-103.js";

describe("BT13-103 Akihiro Kurata", () => {
  it("reduces a Belphemon play by deleting a Gizmon Digimon for its play cost", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] },
    });
    expect((replacement as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "CostModifier",
      mode: "reduce",
      costType: "play",
      dynamicFrom: "deletedDigimonPlayCost",
      cost: {
        kind: "deleteOwn",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] },
          count: 1,
        },
      },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("draws and trashes, then optionally places this Tamer under a Belphemon to delete an opposing level 6", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions?.slice(0, 2)).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
    ]);
    expect(effect?.actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [6] }, count: 1 },
      cost: {
        kind: "place",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        destination: "digivolutionStack",
        position: "bottom",
        host: "target",
        underFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] },
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("draws and trashes at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-103", as: "akihiro" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          hand: [
            { card: "BT1-002", as: "discard" },
            { card: "BT1-003", as: "keep" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("akihiro"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
