import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-095.js";
import "../index.js";

describe("BT26-095 compiled fidelity", () => {
  it("registers the placement cost and Digimon-deletion reaction in printed order", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      {
        kind: "CostGatedBlock",
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom", faceDown: true },
        actions: [
          { kind: "Draw", amount: 1 },
          { kind: "GainMemory", amount: 1 },
        ],
      },
    ]);
    const watcher = card?.effects?.find((effect) => effect.trigger === "AllTurns")?.actions?.[0];
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { kind: ["Digimon"] } });
    expect(irNode(watcher)?.actions).toMatchObject([
      {
        kind: "CostGatedBlock",
        cost: { kind: "suspend" },
        actions: [
          { kind: "Draw", amount: 1 },
          { kind: "Trash", target: { filter: { zone: "hand" }, count: 1 } },
          { kind: "PlaceUnder", faceDown: true },
        ],
      },
    ]);
  });

  it("places a BEATBREAK card under itself, draws, and gains memory at main-phase start", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "reina" }],
          hand: [{ card: "ST23-08", as: "beatbreak" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("reina").stack.some((card) => card.cardId === "ST23-08")).toBe(true);
  });

  it("reacts to a Digimon deletion with draw, discard, and face-down BEATBREAK placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "reina" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          trash: [{ card: "ST23-08", as: "beatbreak" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.perm("reina").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.perm("reina").stack[0]).toMatchObject({ instanceId: s.inst("beatbreak").instanceId, faceUp: false });
  });

  it("does not draw, discard, or place after a deletion when already suspended (Q7164)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "makoto", suspended: true }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          trash: [{ card: "ST23-08", as: "beatbreak" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("makoto").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "ST23-08")).toBe(true);
  });
});
